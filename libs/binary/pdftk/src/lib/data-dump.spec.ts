import { describe, expect, it } from 'bun:test';
import { parseDataDump } from './data-dump';

describe('pdftk.dataDump', () => {
  it('parse sample 1', () => {
    const data = `InfoBegin
InfoKey: Creator
InfoValue: CorelDRAW
InfoBegin
InfoKey: Producer
InfoValue: Corel PDF Engine Version 3.0.0.576
InfoBegin
InfoKey: Author
InfoValue: Beattie
InfoBegin
InfoKey: Title
InfoValue: Graphic1
PdfID0: e03fa4d27fcf93afc0999c98923ed6bc
PdfID1: a104ff725b47de4696193836607ed03e
NumberOfPages: 1
PageMediaBegin
PageMediaNumber: 1
PageMediaRotation: 0
PageMediaRect: -9 -9 604.276 850.89
PageMediaDimensions: 613.276 859.89`;
    const output = parseDataDump(data);
    expect(output).toEqual({
      info: {
        author: 'Beattie',
        creator: 'CorelDRAW',
        producer: 'Corel PDF Engine Version 3.0.0.576',
        title: 'Graphic1',
      },
      meta: {
        id0: 'e03fa4d27fcf93afc0999c98923ed6bc',
        id1: 'a104ff725b47de4696193836607ed03e',
        numberOfPages: 1,
      },
      pages: [
        {
          dimensions: [613.276, 859.89],
          number: 1,
          rect: [-9, -9, 604.276, 850.89],
          rotation: 0,
        },
      ],
    });
  });

  it('parse sample 2', () => {
    const data = `InfoBegin
InfoKey: Keywords
InfoValue: PDF Form
InfoBegin
InfoKey: Creator
InfoValue: Writer
InfoBegin
InfoKey: CreationDate
InfoValue: D:20130629204853+02'00'
InfoBegin
InfoKey: Producer
InfoValue: OpenOffice.org 3.4
InfoBegin
InfoKey: Title
InfoValue: PDF Form Example
PdfID0: 5e0a553555622a0516e9877ca55217a6
PdfID1: 5e0a553555622a0516e9877ca55217a6
NumberOfPages: 1
PageMediaBegin
PageMediaNumber: 1
PageMediaRotation: 0
PageMediaRect: 0 0 595 842
PageMediaDimensions: 595 842`;
    const output = parseDataDump(data);
    expect(output).toEqual({
      info: {
        creationDate: new Date('2013-06-29T18:48:53.000Z'),
        creator: 'Writer',
        keywords: 'PDF Form',
        producer: 'OpenOffice.org 3.4',
        title: 'PDF Form Example',
      },
      meta: {
        id0: '5e0a553555622a0516e9877ca55217a6',
        id1: '5e0a553555622a0516e9877ca55217a6',
        numberOfPages: 1,
      },
      pages: [
        {
          dimensions: [595, 842],
          number: 1,
          rect: [0, 0, 595, 842],
          rotation: 0,
        },
      ],
    });
  });

  it('parse sample 3', () => {
    const data = `InfoBegin
InfoKey: ModDate
InfoValue: D:20240615085331+02'00'
InfoBegin
InfoKey: Creator
InfoValue: pdftk-java 3.3.3
InfoBegin
InfoKey: CreationDate
InfoValue: D:20240615085331+02'00'
InfoBegin
InfoKey: Producer
InfoValue: itext-paulo-155 (itextpdf.sf.net - lowagie.com)
PdfID0: 9e2eed3ca28c3dd679078b85c684e47c
PdfID1: c84a96e1b40ffc9e7ccb412c65f0492b
NumberOfPages: 2
PageMediaBegin
PageMediaNumber: 1
PageMediaRotation: 0
PageMediaRect: -9 -9 604.276 850.89
PageMediaDimensions: 613.276 859.89
PageMediaBegin
PageMediaNumber: 2
PageMediaRotation: 0
PageMediaRect: 0 0 595 842
PageMediaDimensions: 595 842`;
    const output = parseDataDump(data);
    expect(output).toEqual({
      info: {
        creationDate: new Date('2024-06-15T06:53:31.000Z'),
        creator: 'pdftk-java 3.3.3',
        modDate: new Date('2024-06-15T06:53:31.000Z'),
        producer: 'itext-paulo-155 (itextpdf.sf.net - lowagie.com)',
      },
      meta: {
        id0: '9e2eed3ca28c3dd679078b85c684e47c',
        id1: 'c84a96e1b40ffc9e7ccb412c65f0492b',
        numberOfPages: 2,
      },
      pages: [
        {
          dimensions: [613.276, 859.89],
          number: 1,
          rect: [-9, -9, 604.276, 850.89],
          rotation: 0,
        },
        {
          dimensions: [595, 842],
          number: 2,
          rect: [0, 0, 595, 842],
          rotation: 0,
        },
      ],
    });
  });
});
