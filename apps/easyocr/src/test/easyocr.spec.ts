import { describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import { currentArch } from '@container/docker';
import { useTestContainer } from '@container/test/bun';
import { testRequest } from '@container/test/request';

const containerPort = 5000;

describe('easyocr', () => {
  [currentArch()]
    .filter((arch) => arch === 'amd64')
    .map((arch) => {
      describe(`arch: ${arch}`, async () => {
        const setup = await useTestContainer({
          image: `philiplehmann/easyocr:test-${arch}`,
          containerPort,
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
        });

        it('should ocr and detect from agrisano sample', async () => {
          const file = resolve(__dirname, 'assets/agrisano.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(text)).toEqual({
            imageSize: {
              height: 217,
              width: 346,
            },
            results: [
              {
                boxes: [
                  [107, 83],
                  [239, 83],
                  [239, 99],
                  [107, 99],
                ],
                confident: 0.6940127526046569,
                text: 'Versicheren-Nr. 59999',
              },
              {
                boxes: [
                  [21, 123],
                  [97, 123],
                  [97, 137],
                  [21, 137],
                ],
                confident: 0.3126123169402521,
                text: 'HuSTERAHN',
              },
              {
                boxes: [
                  [21, 145],
                  [99, 145],
                  [99, 159],
                  [21, 159],
                ],
                confident: 0.2963997251416854,
                text: 'ClUDI: Sofe',
              },
              {
                boxes: [
                  [265, 145],
                  [327, 145],
                  [327, 159],
                  [265, 159],
                ],
                confident: 0.4705656312942336,
                text: '24/04 2000',
              },
              {
                boxes: [
                  [21, 169],
                  [117, 169],
                  [117, 183],
                  [21, 183],
                ],
                confident: 0.7763744020826971,
                text: '756.12345678,90',
              },
              {
                boxes: [
                  [237, 169],
                  [273, 169],
                  [273, 183],
                  [237, 183],
                ],
                confident: 0.9937847871466061,
                text: '01560',
              },
              {
                boxes: [
                  [279, 171],
                  [327, 171],
                  [327, 183],
                  [279, 183],
                ],
                confident: 0.14799288982914632,
                text: 'Zgrisano',
              },
              {
                boxes: [
                  [21, 193],
                  [153, 193],
                  [153, 207],
                  [21, 207],
                ],
                confident: 0.62490466279018,
                text: '8075602560012345678X',
              },
              {
                boxes: [
                  [265, 193],
                  [327, 193],
                  [327, 207],
                  [265, 207],
                ],
                confident: 0.9070009679578248,
                text: '31/03/2099',
              },
            ],
          });
        });

        it('should ocr and detect from helsana sample', async () => {
          const file = resolve(__dirname, 'assets/helsana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(text)).toEqual({
            imageSize: {
              height: 249,
              width: 385,
            },
            results: [
              {
                boxes: [
                  [81, 11],
                  [297, 11],
                  [297, 25],
                  [81, 25],
                ],
                confident: 0.09458691863922233,
                text: 'EUROpAISCHE KraNKENversicHERUNGSKARTE',
              },
              {
                boxes: [
                  [103, 85],
                  [277, 85],
                  [277, 101],
                  [103, 101],
                ],
                confident: 0.7808866442603628,
                text: 'Notfallnummer +41 58 340 16 11',
              },
              {
                boxes: [
                  [134, 101],
                  [243, 101],
                  [243, 115],
                  [134, 115],
                ],
                confident: 0.14631085439301492,
                text: 'Im Ir-Aueland , 7x24 Sld',
              },
              {
                boxes: [
                  [23, 137],
                  [77, 137],
                  [77, 151],
                  [23, 151],
                ],
                confident: 0.9915759975781381,
                text: 'HUBERLI',
              },
              {
                boxes: [
                  [23, 163],
                  [73, 163],
                  [73, 177],
                  [23, 177],
                ],
                confident: 0.9997115900772944,
                text: 'ROBERT',
              },
              {
                boxes: [
                  [291, 163],
                  [361, 163],
                  [361, 177],
                  [291, 177],
                ],
                confident: 0.9999072621741674,
                text: '26/04/1987',
              },
              {
                boxes: [
                  [23, 189],
                  [129, 189],
                  [129, 203],
                  [23, 203],
                ],
                confident: 0.7873787998604973,
                text: '756.0006.4893.68',
              },
              {
                boxes: [
                  [267, 189],
                  [305, 189],
                  [305, 203],
                  [267, 203],
                ],
                confident: 0.9988814919751061,
                text: '01562',
              },
              {
                boxes: [
                  [313, 189],
                  [361, 189],
                  [361, 203],
                  [313, 203],
                ],
                confident: 0.9982127536893531,
                text: 'Helsana',
              },
              {
                boxes: [
                  [25, 213],
                  [163, 213],
                  [163, 229],
                  [25, 229],
                ],
                confident: 0.9930970971592975,
                text: '80756520220920110917',
              },
              {
                boxes: [
                  [293, 213],
                  [361, 213],
                  [361, 227],
                  [293, 227],
                ],
                confident: 0.9999700680935377,
                text: '30/09/2028',
              },
            ],
          });
        });

        it('should ocr and detect from sanitas sample', async () => {
          const file = resolve(__dirname, 'assets/sanitas.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(text)).toEqual({
            imageSize: {
              height: 620,
              width: 1000,
            },
            results: [
              {
                boxes: [
                  [230, 14],
                  [762, 14],
                  [762, 46],
                  [230, 46],
                ],
                confident: 0.9743323785558079,
                text: 'EUROPÄISCHE KRANKENVERSICHERUNGSKARTE',
              },
              {
                boxes: [
                  [956, 14],
                  [984, 14],
                  [984, 50],
                  [956, 50],
                ],
                confident: 0.9999938011265499,
                text: '5',
              },
              {
                boxes: [
                  [231, 211],
                  [731, 211],
                  [731, 251],
                  [231, 251],
                ],
                confident: 0.567039573951655,
                text: '24 h Int. Medical Helpline & Assistance',
              },
              {
                boxes: [
                  [231, 245],
                  [499, 245],
                  [499, 281],
                  [231, 281],
                ],
                confident: 0.5067885844088358,
                text: '+41 (0) 00 000 00 00',
              },
              {
                boxes: [
                  [860, 234],
                  [902, 234],
                  [902, 264],
                  [860, 264],
                ],
                confident: 0.9768428420730544,
                text: 'CH',
              },
              {
                boxes: [
                  [57, 331],
                  [121, 331],
                  [121, 349],
                  [57, 349],
                ],
                confident: 0.7666871370651541,
                text: '3 Name',
              },
              {
                boxes: [
                  [66, 356],
                  [150, 356],
                  [150, 388],
                  [66, 388],
                ],
                confident: 0.9999941356763207,
                text: 'Bauer',
              },
              {
                boxes: [
                  [72, 396],
                  [153, 396],
                  [153, 416],
                  [72, 416],
                ],
                confident: 0.7332127483666725,
                text: 'Vornamen',
              },
              {
                boxes: [
                  [811, 397],
                  [937, 397],
                  [937, 415],
                  [811, 415],
                ],
                confident: 0.8038381276365872,
                text: '5 Geburtsdatum',
              },
              {
                boxes: [
                  [66, 422],
                  [142, 422],
                  [142, 454],
                  [66, 454],
                ],
                confident: 0.9999904571439411,
                text: 'Fabio',
              },
              {
                boxes: [
                  [780, 422],
                  [928, 422],
                  [928, 454],
                  [780, 454],
                ],
                confident: 0.9929339891714033,
                text: '01.02.1989',
              },
              {
                boxes: [
                  [57, 465],
                  [253, 465],
                  [253, 481],
                  [57, 481],
                ],
                confident: 0.8927064557982116,
                text: '6 Persönliche Kennnumer',
              },
              {
                boxes: [
                  [744, 463],
                  [939, 463],
                  [939, 483],
                  [744, 483],
                ],
                confident: 0.9986617366504413,
                text: 'Kennnummer des Trägers',
              },
              {
                boxes: [
                  [66, 490],
                  [298, 490],
                  [298, 520],
                  [66, 520],
                ],
                confident: 0.9649325970864442,
                text: '756.1234.5678.00',
              },
              {
                boxes: [
                  [722, 490],
                  [808, 490],
                  [808, 520],
                  [722, 520],
                ],
                confident: 0.9999973343988308,
                text: '01509',
              },
              {
                boxes: [
                  [828, 490],
                  [928, 490],
                  [928, 522],
                  [828, 522],
                ],
                confident: 0.9999925205495025,
                text: 'Sanitas',
              },
              {
                boxes: [
                  [55, 529],
                  [251, 529],
                  [251, 550],
                  [55, 550],
                ],
                confident: 0.9213307647631553,
                text: '8 Kennnummer der Karte',
              },
              {
                boxes: [
                  [823, 531],
                  [937, 531],
                  [937, 549],
                  [823, 549],
                ],
                confident: 0.999865129744473,
                text: '9Ablaufdatum',
              },
              {
                boxes: [
                  [64, 556],
                  [386, 556],
                  [386, 588],
                  [64, 588],
                ],
                confident: 0.9291393147135578,
                text: '80756015090123456789',
              },
              {
                boxes: [
                  [784, 556],
                  [930, 556],
                  [930, 588],
                  [784, 588],
                ],
                confident: 0.9496710282034131,
                text: '30.06.2Oxx',
              },
            ],
          });
        });

        it('should ocr and detect from sumiswalder sample', async () => {
          const file = resolve(__dirname, 'assets/sumiswalder.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(text)).toEqual({
            imageSize: {
              height: 510,
              width: 800,
            },
            results: [
              {
                boxes: [
                  [154, 12],
                  [641, 12],
                  [641, 40],
                  [154, 40],
                ],
                confident: 0.9814806676821877,
                text: 'EUROPÄISCHE KRANKENVERSICHERUNGSKARTE',
              },
              {
                boxes: [
                  [170, 170],
                  [424, 170],
                  [424, 198],
                  [170, 198],
                ],
                confident: 0.8418800075022713,
                text: 'Versichertennummer:',
              },
              {
                boxes: [
                  [436, 168],
                  [502, 168],
                  [502, 198],
                  [436, 198],
                ],
                confident: 0.9999991655349731,
                text: '1234',
              },
              {
                boxes: [
                  [43, 263],
                  [95, 263],
                  [95, 283],
                  [43, 283],
                ],
                confident: 0.9987776875495911,
                text: 'Name',
              },
              {
                boxes: [
                  [44, 288],
                  [108, 288],
                  [108, 316],
                  [44, 316],
                ],
                confident: 0.8730617165565491,
                text: 'MAX',
              },
              {
                boxes: [
                  [41, 317],
                  [132, 317],
                  [132, 343],
                  [41, 343],
                ],
                confident: 0.9987378905655304,
                text: 'Vornamen',
              },
              {
                boxes: [
                  [655, 317],
                  [773, 317],
                  [773, 337],
                  [655, 337],
                ],
                confident: 0.9997994965585233,
                text: 'Geburtsdatum',
              },
              {
                boxes: [
                  [44, 344],
                  [160, 344],
                  [160, 374],
                  [44, 374],
                ],
                confident: 0.9999701670359346,
                text: 'MUSTER',
              },
              {
                boxes: [
                  [628, 342],
                  [770, 342],
                  [770, 374],
                  [628, 374],
                ],
                confident: 0.9837406477313129,
                text: '01/01/2010',
              },
              {
                boxes: [
                  [42, 374],
                  [256, 374],
                  [256, 398],
                  [42, 398],
                ],
                confident: 0.8712220424351412,
                text: 'Persönliche Kennnummer',
              },
              {
                boxes: [
                  [561, 375],
                  [775, 375],
                  [775, 395],
                  [561, 395],
                ],
                confident: 0.927830422387153,
                text: 'Kennnummer des Trägers',
              },
              {
                boxes: [
                  [42, 400],
                  [264, 400],
                  [264, 430],
                  [42, 430],
                ],
                confident: 0.8139588074960924,
                text: '756.6290.1234.56',
              },
              {
                boxes: [
                  [530, 402],
                  [596, 402],
                  [596, 430],
                  [530, 430],
                ],
                confident: 0.9999883770942688,
                text: '0194',
              },
              {
                boxes: [
                  [613, 402],
                  [767, 402],
                  [767, 430],
                  [613, 430],
                ],
                confident: 0.971769623837625,
                text: 'Sumiswalder',
              },
              {
                boxes: [
                  [22, 430],
                  [240, 430],
                  [240, 454],
                  [22, 454],
                ],
                confident: 0.3761493922600174,
                text: '8. Kennnummer_der Karte',
              },
              {
                boxes: [
                  [669, 433],
                  [773, 433],
                  [773, 449],
                  [669, 449],
                ],
                confident: 0.785209321927072,
                text: 'Ablautdatum',
              },
              {
                boxes: [
                  [42, 454],
                  [342, 454],
                  [342, 486],
                  [42, 486],
                ],
                confident: 0.9999980007969674,
                text: '12345601940001234567',
              },
              {
                boxes: [
                  [628, 458],
                  [768, 458],
                  [768, 488],
                  [628, 488],
                ],
                confident: 0.9999925736183721,
                text: '31/12/2021',
              },
            ],
          });
        });

        it('should ocr and detect from sympany sample', async () => {
          const file = resolve(__dirname, 'assets/sympany.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(text)).toEqual({
            imageSize: {
              height: 290,
              width: 450,
            },
            results: [
              {
                boxes: [
                  [91, 13],
                  [360, 13],
                  [360, 29],
                  [91, 29],
                ],
                confident: 0.8159798005339984,
                text: 'EUROPÄISCHE KRANKENVERSICHERUNGSKARTE',
              },
              {
                boxes: [
                  [99, 109],
                  [337, 109],
                  [337, 123],
                  [99, 123],
                ],
                confident: 0.7939080386204346,
                text: 'Medizinischer Notfall im Ausland (24h)',
              },
              {
                boxes: [
                  [99, 123],
                  [201, 123],
                  [201, 137],
                  [99, 137],
                ],
                confident: 0.6989272555967292,
                text: '+4141480 44 22',
              },
              {
                boxes: [
                  [24, 152],
                  [50, 152],
                  [50, 160],
                  [24, 160],
                ],
                confident: 0.24172057211399078,
                text: 'NaMc',
              },
              {
                boxes: [
                  [21, 167],
                  [99, 167],
                  [99, 179],
                  [21, 179],
                ],
                confident: 0.8815686892404839,
                text: 'MUSTERMANN',
              },
              {
                boxes: [
                  [26, 184],
                  [68, 184],
                  [68, 192],
                  [26, 192],
                ],
                confident: 0.20320554381936926,
                text: 'Yoramci',
              },
              {
                boxes: [
                  [374, 184],
                  [434, 184],
                  [434, 192],
                  [374, 192],
                ],
                confident: 0.10937690279302836,
                text: 'Gcoursoatun',
              },
              {
                boxes: [
                  [21, 199],
                  [53, 199],
                  [53, 211],
                  [21, 211],
                ],
                confident: 0.9951220750808716,
                text: 'HANS',
              },
              {
                boxes: [
                  [373, 199],
                  [431, 199],
                  [431, 211],
                  [373, 211],
                ],
                confident: 0.9995218188596549,
                text: '08/10/1964',
              },
              {
                boxes: [
                  [26, 216],
                  [70, 216],
                  [70, 224],
                  [26, 224],
                ],
                confident: 0.3312968944729767,
                text: 'PcrsSnlich',
              },
              {
                boxes: [
                  [328, 218],
                  [356, 218],
                  [356, 224],
                  [328, 224],
                ],
                confident: 0.13784681445073824,
                text: 'oin',
              },
              {
                boxes: [
                  [386, 218],
                  [434, 218],
                  [434, 224],
                  [386, 224],
                ],
                confident: 0.0092814911938453,
                text: 'ree',
              },
              {
                boxes: [
                  [19, 231],
                  [107, 231],
                  [107, 245],
                  [19, 245],
                ],
                confident: 0.8475899332569471,
                text: '756.1234.1234.56',
              },
              {
                boxes: [
                  [315, 231],
                  [345, 231],
                  [345, 245],
                  [315, 245],
                ],
                confident: 0.9560605317777079,
                text: '0509',
              },
              {
                boxes: [
                  [353, 231],
                  [433, 231],
                  [433, 245],
                  [353, 245],
                ],
                confident: 0.7457569285167235,
                text: 'Vivao Sympany',
              },
              {
                boxes: [
                  [26, 250],
                  [64, 250],
                  [64, 258],
                  [26, 258],
                ],
                confident: 0.17207932941619927,
                text: 'Kcninun',
              },
              {
                boxes: [
                  [84, 250],
                  [122, 250],
                  [122, 258],
                  [84, 258],
                ],
                confident: 0.030969635911362946,
                text: 'Ccikang',
              },
              {
                boxes: [
                  [380, 250],
                  [434, 250],
                  [434, 258],
                  [380, 258],
                ],
                confident: 0.10741532577474626,
                text: 'Acuioatun',
              },
              {
                boxes: [
                  [21, 262],
                  [144, 262],
                  [144, 276],
                  [21, 276],
                ],
                confident: 0.8696763643042476,
                text: '80756005090012312345',
              },
              {
                boxes: [
                  [373, 263],
                  [433, 263],
                  [433, 277],
                  [373, 277],
                ],
                confident: 0.999901833463651,
                text: '31/03/2025',
              },
            ],
          });
        });

        it('should ocr and detect from visana sample', async () => {
          const file = resolve(__dirname, 'assets/visana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(text)).toEqual({
            imageSize: {
              height: 265,
              width: 410,
            },
            results: [
              {
                boxes: [
                  [83, 15],
                  [320, 15],
                  [320, 27],
                  [83, 27],
                ],
                confident: 0.870416696984809,
                text: 'EUROPAISCHE KRANKENVERSICHERUNGSKARTE',
              },
              {
                boxes: [
                  [89, 89],
                  [313, 89],
                  [313, 109],
                  [89, 109],
                ],
                confident: 0.9315414047515256,
                text: 'Bei Notfällen im Ausland (24h)',
              },
              {
                boxes: [
                  [129, 107],
                  [277, 107],
                  [277, 125],
                  [129, 125],
                ],
                confident: 0.9943768912740496,
                text: '+41 (0)848 848 855',
              },
              {
                boxes: [
                  [19, 147],
                  [79, 147],
                  [79, 161],
                  [19, 161],
                ],
                confident: 0.9138218354537562,
                text: 'HUSTER',
              },
              {
                boxes: [
                  [19, 173],
                  [121, 173],
                  [121, 189],
                  [19, 189],
                ],
                confident: 0.9799602762240135,
                text: 'MARIA-LUISA',
              },
              {
                boxes: [
                  [301, 173],
                  [383, 173],
                  [383, 189],
                  [301, 189],
                ],
                confident: 0.9990999303243365,
                text: '25.09.1980',
              },
              {
                boxes: [
                  [21, 199],
                  [149, 199],
                  [149, 217],
                  [21, 217],
                ],
                confident: 0.889006712173121,
                text: '756.3047.5009.62',
              },
              {
                boxes: [
                  [257, 201],
                  [303, 201],
                  [303, 217],
                  [257, 217],
                ],
                confident: 0.9922346215060274,
                text: '01555',
              },
              {
                boxes: [
                  [324, 199],
                  [383, 199],
                  [383, 218],
                  [324, 218],
                ],
                confident: 0.9875988608144999,
                text: 'Visana',
              },
              {
                boxes: [
                  [21, 227],
                  [173, 227],
                  [173, 243],
                  [21, 243],
                ],
                confident: 0.9886782694808159,
                text: '807560156202452130',
              },
              {
                boxes: [
                  [299, 227],
                  [383, 227],
                  [383, 243],
                  [299, 243],
                ],
                confident: 0.985111791554311,
                text: '31.12.2018',
              },
            ],
          });
        });
      });
    });
});
