//! pdftk `encrypt` / `decrypt`: owner and user passwords and permissions.

use std::collections::BTreeMap;
use std::sync::Arc;

use lopdf::encryption::crypt_filters::{Aes128CryptFilter, Aes256CryptFilter, CryptFilter};
use lopdf::{EncryptionState, EncryptionVersion, Permissions};
use serde::Deserialize;
use utoipa::ToSchema;

use super::{PdfError, open, save};

/// pdftk's `allow` permissions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
pub enum Allow {
  /// Top quality printing.
  Printing,
  /// Lower quality printing.
  DegradedPrinting,
  /// Modify the content; also allows `Assembly`.
  ModifyContents,
  /// Insert, rotate, delete pages, create bookmarks.
  Assembly,
  /// Copy text and graphics; also allows `ScreenReaders`.
  CopyContents,
  /// Extract text for accessibility.
  ScreenReaders,
  /// Add and change annotations; also allows `FillIn`.
  ModifyAnnotations,
  /// Fill in form fields.
  FillIn,
  /// Everything above.
  AllFeatures,
}

impl Allow {
  fn permissions(self) -> Permissions {
    match self {
      Allow::Printing => Permissions::PRINTABLE | Permissions::PRINTABLE_IN_HIGH_QUALITY,
      Allow::DegradedPrinting => Permissions::PRINTABLE,
      Allow::ModifyContents => Permissions::MODIFIABLE | Permissions::ASSEMBLABLE,
      Allow::Assembly => Permissions::ASSEMBLABLE,
      Allow::CopyContents => Permissions::COPYABLE | Permissions::COPYABLE_FOR_ACCESSIBILITY,
      Allow::ScreenReaders => Permissions::COPYABLE_FOR_ACCESSIBILITY,
      Allow::ModifyAnnotations => Permissions::ANNOTABLE | Permissions::FILLABLE,
      Allow::FillIn => Permissions::FILLABLE,
      Allow::AllFeatures => Permissions::all(),
    }
  }
}

/// The encryption algorithm.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
pub enum Encryption {
  /// AES-256 (PDF 2.0, revision 6). The default.
  #[default]
  #[serde(rename = "aes256")]
  Aes256,
  /// AES-128 (PDF 1.6).
  #[serde(rename = "aes128")]
  Aes128,
  /// RC4 128 bit (pdftk's default; weak, for old readers only).
  #[serde(rename = "128bit")]
  Rc4_128,
  /// RC4 40 bit (weak, for very old readers only).
  #[serde(rename = "40bit")]
  Rc4_40,
}

pub struct EncryptOptions<'a> {
  pub owner_password: &'a str,
  pub user_password: Option<&'a str>,
  pub allow: &'a [Allow],
  pub encryption: Encryption,
}

/// Encrypt with an owner password (and optionally a user password needed to open the file).
/// Without `allow` every permission is withheld, as pdftk does.
pub fn encrypt(bytes: &[u8], input_password: Option<&str>, options: &EncryptOptions) -> Result<Vec<u8>, PdfError> {
  if options.owner_password.is_empty() {
    return Err(PdfError::BadRequest("password must not be empty".into()));
  }
  let mut doc = open(bytes, input_password)?;
  // PDF 2.0: the accessibility bit must always be set.
  let permissions = options
    .allow
    .iter()
    .fold(Permissions::COPYABLE_FOR_ACCESSIBILITY, |p, a| p | a.permissions());
  let owner_password = options.owner_password;
  let user_password = options.user_password.unwrap_or("");
  if doc.trailer.get(b"ID").is_err() {
    // RC4 and AES-128 keys are derived from the file identifier.
    let id = lopdf::Object::String(random::<16>()?.to_vec(), lopdf::StringFormat::Hexadecimal);
    doc.trailer.set(b"ID", lopdf::Object::Array(vec![id.clone(), id]));
  }
  let key = random::<32>()?;
  let filters = |filter: Arc<dyn CryptFilter>| BTreeMap::from([(b"StdCF".to_vec(), filter)]);
  let version = match options.encryption {
    Encryption::Aes256 => EncryptionVersion::V5 {
      encrypt_metadata: true,
      crypt_filters: filters(Arc::new(Aes256CryptFilter)),
      file_encryption_key: &key,
      stream_filter: b"StdCF".to_vec(),
      string_filter: b"StdCF".to_vec(),
      owner_password,
      user_password,
      permissions,
    },
    Encryption::Aes128 => EncryptionVersion::V4 {
      document: &doc,
      encrypt_metadata: true,
      crypt_filters: filters(Arc::new(Aes128CryptFilter)),
      stream_filter: b"StdCF".to_vec(),
      string_filter: b"StdCF".to_vec(),
      owner_password,
      user_password,
      permissions,
    },
    Encryption::Rc4_128 => EncryptionVersion::V2 {
      document: &doc,
      owner_password,
      user_password,
      key_length: 128,
      permissions,
    },
    Encryption::Rc4_40 => EncryptionVersion::V1 {
      document: &doc,
      owner_password,
      user_password,
      permissions,
    },
  };
  let state = EncryptionState::try_from(version).map_err(|e| PdfError::Write(e.to_string()))?;
  // Objects are encrypted one by one; object streams would hide them from the encryption.
  doc.decompress();
  doc.encrypt(&state).map_err(|e| PdfError::Write(e.to_string()))?;
  save(&mut doc, false)
}

/// Remove the encryption; `password` is the owner or user password (none for files that open
/// without one).
pub fn decrypt(bytes: &[u8], password: Option<&str>) -> Result<Vec<u8>, PdfError> {
  let mut doc = open(bytes, password)?;
  save(&mut doc, false)
}

fn random<const N: usize>() -> Result<[u8; N], PdfError> {
  let mut bytes = [0u8; N];
  getrandom::fill(&mut bytes).map_err(|e| PdfError::Write(format!("random: {e}")))?;
  Ok(bytes)
}
