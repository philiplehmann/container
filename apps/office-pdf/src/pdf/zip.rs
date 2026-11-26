//! A minimal ZIP writer (stored entries): the PDFs and images it packs are compressed already.

/// A ZIP archive of `(name, bytes)` entries.
pub fn zip(entries: &[(String, Vec<u8>)]) -> Vec<u8> {
  let mut out = Vec::new();
  let mut central = Vec::new();
  for (name, data) in entries {
    let offset = out.len() as u32;
    let crc = crc32fast::hash(data);
    let size = data.len() as u32;
    let name = name.as_bytes();
    // Local file header: version 2.0, UTF-8 names (bit 11), stored, no time (1980-01-01).
    let header = |signature: u32, central: bool| {
      let mut h = Vec::with_capacity(46 + name.len());
      h.extend_from_slice(&signature.to_le_bytes());
      if central {
        h.extend_from_slice(&20u16.to_le_bytes()); // version made by
      }
      h.extend_from_slice(&20u16.to_le_bytes()); // version needed
      h.extend_from_slice(&0x0800u16.to_le_bytes()); // flags: UTF-8
      h.extend_from_slice(&0u16.to_le_bytes()); // stored
      h.extend_from_slice(&0u16.to_le_bytes()); // time
      h.extend_from_slice(&0x0021u16.to_le_bytes()); // date 1980-01-01
      h.extend_from_slice(&crc.to_le_bytes());
      h.extend_from_slice(&size.to_le_bytes());
      h.extend_from_slice(&size.to_le_bytes());
      h.extend_from_slice(&(name.len() as u16).to_le_bytes());
      h.extend_from_slice(&0u16.to_le_bytes()); // extra
      if central {
        h.extend_from_slice(&0u16.to_le_bytes()); // comment
        h.extend_from_slice(&0u16.to_le_bytes()); // disk
        h.extend_from_slice(&0u16.to_le_bytes()); // internal attributes
        h.extend_from_slice(&0u32.to_le_bytes()); // external attributes
        h.extend_from_slice(&offset.to_le_bytes());
      }
      h.extend_from_slice(name);
      h
    };
    out.extend_from_slice(&header(0x0403_4b50, false));
    out.extend_from_slice(data);
    central.extend_from_slice(&header(0x0201_4b50, true));
  }
  let central_offset = out.len() as u32;
  out.extend_from_slice(&central);
  out.extend_from_slice(&0x0605_4b50u32.to_le_bytes());
  out.extend_from_slice(&[0; 4]); // disk numbers
  out.extend_from_slice(&(entries.len() as u16).to_le_bytes());
  out.extend_from_slice(&(entries.len() as u16).to_le_bytes());
  out.extend_from_slice(&(central.len() as u32).to_le_bytes());
  out.extend_from_slice(&central_offset.to_le_bytes());
  out.extend_from_slice(&0u16.to_le_bytes()); // comment
  out
}

/// The entries of a stored ZIP archive (for tests and clients of [`zip`]).
pub fn unzip(archive: &[u8]) -> Vec<(String, Vec<u8>)> {
  let mut entries = Vec::new();
  let mut at = 0;
  while archive.get(at..at + 4) == Some(&0x0403_4b50u32.to_le_bytes()) {
    let u16_at = |o: usize| u16::from_le_bytes([archive[at + o], archive[at + o + 1]]) as usize;
    let u32_at = |o: usize| u32::from_le_bytes(archive[at + o..at + o + 4].try_into().unwrap_or([0; 4])) as usize;
    let (size, name_len, extra) = (u32_at(18), u16_at(26), u16_at(28));
    let name_start = at + 30;
    let data_start = name_start + name_len + extra;
    let name = String::from_utf8_lossy(&archive[name_start..name_start + name_len]).to_string();
    entries.push((name, archive[data_start..data_start + size].to_vec()));
    at = data_start + size;
  }
  entries
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn round_trips() {
    let entries = vec![("a.pdf".to_string(), b"%PDF-1".to_vec()), ("ü.txt".to_string(), vec![])];
    assert_eq!(unzip(&zip(&entries)), entries);
  }
}
