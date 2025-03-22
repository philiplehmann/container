import type { DetailTextCoordinates } from './readtext';

interface HealthCardInfo {
  insuranceNumber: string;
  surname: string;
  firstName: string;
  birthDate: string;
  personalNumber: string;
  insuranceCode: string;
  insuranceName: string;
  cardNumber: string;
  expiryDate: string;
  detectedLanguage: string;
}

const FIELD_LABELS: Record<string, Record<string, string[]>> = {
  insurance_number: {
    de: ['Versicherten-Nr', 'Versicherten-Nr.', 'ersicherten-Nr', 'ersicherten-Nr.'],
    fr: ["N° d'assuré", "Numéro d'assuré", 'N° assuré', "No. d'assuré"],
    it: ['N. assicurato', 'Numero assicurato', 'N° assicurato'],
  },
  surname: {
    de: ['3. Name', 'Name', '3.Name'],
    fr: ['3. Nom', 'Nom', '3.Nom'],
    it: ['3. Cognome', 'Cognome', '3.Cognome'],
  },
  first_name: {
    de: ['4. Vornamen', 'Vornamen', '4.Vornamen'],
    fr: ['4. Prénoms', 'Prénoms', '4.Prénoms'],
    it: ['4. Nome', 'Nome', '4.Nome'],
  },
  birth_date: {
    de: ['5. Geburtsdatum', 'Geburtsdatum', '5.Geburtsdatum', 'Geburtsdat'],
    fr: ['5. Date de naissance', 'Date de naissance', '5.Date de naissance'],
    it: ['5. Data di nascita', 'Data di nascita', '5.Data di nascita'],
  },
  personal_number: {
    de: ['6. Persönliche Kennnummer', 'Kennnummer', '6. Personliche'],
    fr: ['6. Numéro personnel', 'Numéro personnel', '6.Numéro personnel'],
    it: ['6. Numero personale', 'Numero personale', '6.Numero personale'],
  },
  insurance_provider_id: {
    de: ['7. Kennnummer des Trägers', '7. Kennnummer'],
    fr: ["7. Code de l'organisme", '7.Code organisme'],
    it: ['7. Codice ente', '7.Codice ente'],
  },
  card_number: {
    de: ['8. Kennnummer der Karte'],
    fr: ['8. Numéro de la carte'],
    it: ['8. Numero della carta'],
  },
  expiry_date: {
    de: ['9. Ablaufdatum'],
    fr: ["9. Date d'expiration"],
    it: ['9. Data di scadenza'],
  },
};

const EXCLUDED_WORDS: Record<string, string[]> = {
  de: ['KARTE', 'VERSICHERUNG', 'EUROPEAN', 'EUROPÄISCHE', 'EUROPAISCHE', 'EUROPÄISCHE', 'KRANKENVERSICHERUNGSKARTE'],
  fr: ['CARTE', 'ASSURANCE', 'EUROPÉENNE', 'SANTÉ'],
  it: ['CARTA', 'ASSICURAZIONE', 'EUROPEA', 'SANITARIA'],
};

const COUNTRY_CODES = ['CH'];
const SUPPORTED_LANGUAGES = ['de', 'fr', 'it'];

export const detectCardLanguage = (results: DetailTextCoordinates[]): (typeof SUPPORTED_LANGUAGES)[number] => {
  const languageScores: Record<string, number> = {
    de: 0,
    fr: 0,
    it: 0,
  };

  for (const { text, confident } of results) {
    if (confident < 0.4) continue;

    const trimed = text.trim();

    if (trimed.includes('CARTE EUROPEENNE') || trimed.includes('CARTE EUROPÉENNE')) {
      languageScores.fr += 5;
      continue;
    }

    if (trimed.includes('EUROPÄISCHE')) {
      languageScores.de += 5;
      continue;
    }

    if (trimed.includes('TESSERA EUROPEA')) {
      languageScores.it += 5;
      continue;
    }

    for (const lang of SUPPORTED_LANGUAGES) {
      for (const field of Object.keys(FIELD_LABELS)) {
        if (FIELD_LABELS[field][lang].some((label) => text.includes(label))) {
          languageScores[lang] += 1;
        }
      }
    }
  }

  return Object.entries(languageScores).reduce(
    (acc, [lang, score]) => (score > languageScores[acc] ? lang : acc),
    'de',
  );
};

export const extractSwissHealthCardInfo = (results: DetailTextCoordinates[]): Partial<HealthCardInfo> => {
  const cardInfo: Partial<HealthCardInfo> = {};
  const detectedLang = detectCardLanguage(results);
  cardInfo.detectedLanguage = detectedLang;

  const potentialNames: [string, number, number][] = [];

  results.forEach(({ boxes, text, confident }, idx) => {
    text = text.trim();

    if (confident < 0.4) return;
    if (COUNTRY_CODES.includes(text)) return;

    if (text === text.toUpperCase() && text.length > 2 && confident > 0.7) {
      if (Array.from(text).every((c) => c.match(/[\D]/))) {
        if (
          !Object.values(FIELD_LABELS).some((labels) => labels[detectedLang].includes(text)) &&
          !EXCLUDED_WORDS[detectedLang].some((exclude) => text.includes(exclude))
        ) {
          const y_min = Math.min(...boxes.map((point) => point[1]));
          const x_min = Math.min(...boxes.map((point) => point[0]));
          potentialNames.push([text, y_min, x_min]);
        }
      }
    }

    console.log('potentialNames', potentialNames);

    if (text.includes('756') && confident > 0.7) {
      const cleanedText = text.trim();
      if (cleanedText.startsWith('756') && cleanedText.replace(/\D/g, '').length >= 13) {
        const formatted = cleanedText.replace(/\D/g, '').replace(/(\d{3})(\d{4})(\d{4})(\d{2})?/, '756.$1.$2.$3.$4');
        cardInfo.personalNumber = formatted;
      }
    }

    if (FIELD_LABELS.insurance_number[detectedLang].some((label) => text.includes(label))) {
      const number = text.replace(/\D/g, '');
      if (number.length >= 6) {
        cardInfo.insuranceNumber = number;
      } else if (idx + 1 < results.length) {
        const next_text = results[idx + 1].text.trim();
        const next_number = next_text.replace(/\D/g, '');
        if (next_number.length >= 6) {
          cardInfo.insuranceNumber = next_number;
        }
      }
    }

    if (text.includes('-') && confident > 0.6) {
      const parts = text.split('-').map((p) => p.trim());
      if (parts.length === 2) {
        const code = parts[0].replace(/\D/g, '');
        if (code.length >= 4 && code.length <= 5) {
          cardInfo.insuranceCode = code;
          if (parts[1]) {
            cardInfo.insuranceName = parts[1].split(' ')[0];
          }
        }
      }
    } else if (text.match(/^\d{4,5}$/) && confident > 0.7) {
      cardInfo.insuranceCode = text;
      if (idx + 1 < results.length) {
        const next_text = results[idx + 1].text.trim();
        const next_prob = results[idx + 1].confident;
        if (next_prob > 0.7 && next_text.length > 2 && next_text[0].match(/[A-Z]/) && !next_text.match(/\d/)) {
          cardInfo.insuranceName = next_text.split(' ')[0];
        }
      }
    } else if (confident > 0.6 && text.split(' ').length >= 2) {
      const words = text.split(' ');
      if (words[0].match(/^\d{4,5}$/)) {
        cardInfo.insuranceCode = words[0];
        if (words[1][0].match(/[A-Z]/)) {
          cardInfo.insuranceName = words[1];
        }
      }
    }

    if (text.startsWith('80756') && text.length > 15 && confident > 0.7) {
      cardInfo.cardNumber = text;
    }

    if (text.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = text.split('/').map(Number);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const detected_date = new Date(year, month - 1, day);
        const current_date = new Date();
        if (detected_date > current_date) {
          cardInfo.expiryDate = text;
        } else {
          cardInfo.birthDate = text;
        }
      }
    }
  });

  if (cardInfo.personalNumber && (!cardInfo.insuranceCode || !cardInfo.insuranceName)) {
    const personalNumberIdx = results.findIndex((result) => result.text.includes(cardInfo.personalNumber ?? ''));
    if (personalNumberIdx !== -1) {
      for (let i = personalNumberIdx + 1; i < Math.min(personalNumberIdx + 5, results.length); i++) {
        const text = results[i].text.trim();
        const prob = results[i].confident;
        if (!cardInfo.insuranceCode && prob > 0.5) {
          const digits = text.replace(/\D/g, '');
          if (digits.length >= 4 && digits.length <= 5) {
            cardInfo.insuranceCode = digits;
            const nonDigits = text.replace(/\d/g, '').trim();
            if (nonDigits?.[0].match(/[A-Z]/)) {
              cardInfo.insuranceName = nonDigits.split(' ')[0];
            }
            continue;
          }
        }
        if (!cardInfo.insuranceName && prob > 0.5 && text[0].match(/[A-Z]/) && !text.match(/\d/)) {
          cardInfo.insuranceName = text.split(' ')[0];
        }
      }
    }
  }

  potentialNames.sort((a, b) => a[1] - b[1] || a[2] - b[2]);

  const filteredNames = potentialNames.filter((nameTuple) => {
    const nameText = nameTuple[0];
    return !Object.values(cardInfo).includes(nameText);
  });

  console.log('filteredNames', filteredNames);

  if (filteredNames.length >= 2) {
    cardInfo.surname = filteredNames[0][0];
    cardInfo.firstName = filteredNames
      .slice(1)
      .map((name) => name[0])
      .join(' ');
  } else if (filteredNames.length === 1) {
    cardInfo.surname = filteredNames[0][0];
  }

  return cardInfo;
};
