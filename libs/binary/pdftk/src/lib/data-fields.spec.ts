import { describe, expect, it } from 'vitest';
import { parseDataFields } from './data-fields';

describe('pdftk.dataFields', () => {
  it('parse sample 1', () => {
    const data = `---
FieldType: Text
FieldName: Name
FieldNameAlt: Please enter your name here
FieldFlags: 8388608
FieldJustification: Left
---
FieldType: Choice
FieldName: Dropdown2
FieldNameAlt: Please select a month here
FieldFlags: 131072
FieldValue: Jan
FieldValueDefault: Jan
FieldJustification: Left
FieldStateOption: Jan
FieldStateOption: Feb
FieldStateOption: Mar
FieldStateOption: Apr
FieldStateOption: May
FieldStateOption: Jun
FieldStateOption: Jul
FieldStateOption: Aug
FieldStateOption: Sep
FieldStateOption: Oct
FieldStateOption: Nov
FieldStateOption: Dec
---
FieldType: Choice
FieldName: Dropdown1
FieldNameAlt: Please select the day of the month here
FieldFlags: 131072
FieldValue: 1
FieldValueDefault: 1
FieldJustification: Left
FieldStateOption: 1
FieldStateOption: 2
FieldStateOption: 3
FieldStateOption: 4
FieldStateOption: 5
FieldStateOption: 6
FieldStateOption: 7
FieldStateOption: 8
FieldStateOption: 9
FieldStateOption: 10
FieldStateOption: 11
FieldStateOption: 12
FieldStateOption: 13
FieldStateOption: 14
FieldStateOption: 15
FieldStateOption: 16
FieldStateOption: 17
FieldStateOption: 18
FieldStateOption: 19
FieldStateOption: 20
FieldStateOption: 21
FieldStateOption: 22
FieldStateOption: 23
FieldStateOption: 24
FieldStateOption: 25
FieldStateOption: 26
FieldStateOption: 27
FieldStateOption: 28
FieldStateOption: 29
FieldStateOption: 30
FieldStateOption: 31
---
FieldType: Choice
FieldName: Dropdown3
FieldNameAlt: Please select a year here
FieldFlags: 131072
FieldValue: 2012
FieldValueDefault: 2012
FieldJustification: Left
FieldStateOption: 2012
FieldStateOption: 2013
FieldStateOption: 2014
FieldStateOption: 2015
FieldStateOption: 2016
FieldStateOption: 2017
FieldStateOption: 2018
FieldStateOption: 2019
FieldStateOption: 2020
FieldStateOption: 2021
FieldStateOption: 2022
FieldStateOption: 2023
FieldStateOption: 2024
FieldStateOption: 2025
---
FieldType: Text
FieldName: Address
FieldNameAlt: Please enter your address here
FieldFlags: 8388608
FieldJustification: Left
---
FieldType: Button
FieldName: Check Box1
FieldFlags: 0
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Check Box2
FieldFlags: 0
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Check Box3
FieldFlags: 0
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Check Box4
FieldFlags: 0
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Text
FieldName: Text5
FieldNameAlt: Please enter your favourite activity here
FieldFlags: 12582912
FieldJustification: Left
---
FieldType: Button
FieldName: Group6
FieldFlags: 49152
FieldJustification: Left
FieldStateOption: Choice1
FieldStateOption: Off
---
FieldType: Text
FieldName: Text6
FieldNameAlt: Please enter your favourite activity here
FieldFlags: 12582912
FieldJustification: Left
---
FieldType: Button
FieldName: Button7
FieldFlags: 65536
FieldJustification: Left
---
FieldType: Text
FieldName: Given Name Text Box
FieldNameAlt: First name
FieldFlags: 0
FieldValue:
FieldJustification: Left
FieldMaxLength: 40
---
FieldType: Text
FieldName: Family Name Text Box
FieldNameAlt: Last name
FieldFlags: 0
FieldValue:
FieldJustification: Left
FieldMaxLength: 40
---
FieldType: Text
FieldName: Address 1 Text Box
FieldFlags: 0
FieldValue:
FieldJustification: Left
FieldMaxLength: 40
---
FieldType: Text
FieldName: House nr Text Box
FieldNameAlt: House and floor
FieldFlags: 0
FieldValue:
FieldJustification: Left
FieldMaxLength: 20
---
FieldType: Text
FieldName: Address 2 Text Box
FieldFlags: 0
FieldValue:
FieldJustification: Left
FieldMaxLength: 40
---
FieldType: Text
FieldName: Postcode Text Box
FieldFlags: 0
FieldValue:
FieldJustification: Left
FieldMaxLength: 20
---
FieldType: Text
FieldName: City Text Box
FieldFlags: 0
FieldValue:
FieldJustification: Left
FieldMaxLength: 40
---
FieldType: Choice
FieldName: Country Combo Box
FieldNameAlt: Use selection or write country name
FieldFlags: 393216
FieldValue:
FieldJustification: Left
FieldStateOption: Austria
FieldStateOption: Belgium
FieldStateOption: Britain
FieldStateOption: Bulgaria
FieldStateOption: Croatia
FieldStateOption: Cyprus
FieldStateOption: Czech-Republic
FieldStateOption: Denmark
FieldStateOption: Estonia
FieldStateOption: Finland
FieldStateOption: France
FieldStateOption: Germany
FieldStateOption: Greece
FieldStateOption: Hungary
FieldStateOption: Ireland
FieldStateOption: Italy
FieldStateOption: Latvia
FieldStateOption: Lithuania
FieldStateOption: Luxembourg
FieldStateOption: Malta
FieldStateOption: Netherlands
FieldStateOption: Poland
FieldStateOption: Portugal
FieldStateOption: Romania
FieldStateOption: Slovakia
FieldStateOption: Slovenia
FieldStateOption: Spain
FieldStateOption: Sweden
---
FieldType: Choice
FieldName: Gender List Box
FieldNameAlt: Select from list
FieldFlags: 131072
FieldValue: Man
FieldValueDefault: Man
FieldJustification: Left
FieldStateOption: Man
FieldStateOption: Woman
---
FieldType: Text
FieldName: Height Formatted Field
FieldNameAlt: Value from 40 to 250 cm
FieldFlags: 0
FieldValue: 150
FieldValueDefault: 150
FieldJustification: Left
FieldMaxLength: 20
---
FieldType: Button
FieldName: Driving License Check Box
FieldNameAlt: Car driving license
FieldFlags: 0
FieldValue: Off
FieldValueDefault: Off
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Language 1 Check Box
FieldFlags: 0
FieldValue: Off
FieldValueDefault: Off
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Language 2 Check Box
FieldFlags: 0
FieldValue: Yes
FieldValueDefault: Yes
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Language 3 Check Box
FieldFlags: 0
FieldValue: Off
FieldValueDefault: Off
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Language 4 Check Box
FieldFlags: 0
FieldValue: Off
FieldValueDefault: Off
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Button
FieldName: Language 5 Check Box
FieldFlags: 0
FieldValue: Off
FieldValueDefault: Off
FieldJustification: Left
FieldStateOption: Off
FieldStateOption: Yes
---
FieldType: Choice
FieldName: Favourite Colour List Box
FieldNameAlt: Select from colour spectrum
FieldFlags: 131072
FieldValue: Red
FieldValueDefault: Red
FieldJustification: Left
FieldStateOption: Black
FieldStateOption: Brown
FieldStateOption: Red
FieldStateOption: Orange
FieldStateOption: Yellow
FieldStateOption: Green
FieldStateOption: Blue
FieldStateOption: Violet
FieldStateOption: Grey
FieldStateOption: White`;
    const output = parseDataFields(data);
    expect(output).toEqual([
      {
        flags: 8388608,
        justification: 'left',
        name: 'Name',
        title: 'Please enter your name here',
        type: 'text',
      },
      {
        defaultValue: 'Jan',
        flags: 131072,
        justification: 'left',
        name: 'Dropdown2',
        options: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        title: 'Please select a month here',
        type: 'choice',
        value: 'Jan',
      },
      {
        defaultValue: '1',
        flags: 131072,
        justification: 'left',
        name: 'Dropdown1',
        options: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
          '13',
          '14',
          '15',
          '16',
          '17',
          '18',
          '19',
          '20',
          '21',
          '22',
          '23',
          '24',
          '25',
          '26',
          '27',
          '28',
          '29',
          '30',
          '31',
        ],
        title: 'Please select the day of the month here',
        type: 'choice',
        value: '1',
      },
      {
        defaultValue: '2012',
        flags: 131072,
        justification: 'left',
        name: 'Dropdown3',
        options: [
          '2012',
          '2013',
          '2014',
          '2015',
          '2016',
          '2017',
          '2018',
          '2019',
          '2020',
          '2021',
          '2022',
          '2023',
          '2024',
          '2025',
        ],
        title: 'Please select a year here',
        type: 'choice',
        value: '2012',
      },
      {
        flags: 8388608,
        justification: 'left',
        name: 'Address',
        title: 'Please enter your address here',
        type: 'text',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Check Box1',
        options: ['Off', 'Yes'],
        type: 'button',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Check Box2',
        options: ['Off', 'Yes'],
        type: 'button',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Check Box3',
        options: ['Off', 'Yes'],
        type: 'button',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Check Box4',
        options: ['Off', 'Yes'],
        type: 'button',
      },
      {
        flags: 12582912,
        justification: 'left',
        name: 'Text5',
        title: 'Please enter your favourite activity here',
        type: 'text',
      },
      {
        flags: 49152,
        justification: 'left',
        name: 'Group6',
        options: ['Choice1', 'Off'],
        type: 'button',
      },
      {
        flags: 12582912,
        justification: 'left',
        name: 'Text6',
        title: 'Please enter your favourite activity here',
        type: 'text',
      },
      {
        flags: 65536,
        justification: 'left',
        name: 'Button7',
        type: 'button',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Given Name Text Box',
        title: 'First name',
        type: 'text',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Family Name Text Box',
        title: 'Last name',
        type: 'text',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Address 1 Text Box',
        type: 'text',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'House nr Text Box',
        title: 'House and floor',
        type: 'text',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Address 2 Text Box',
        type: 'text',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'Postcode Text Box',
        type: 'text',
      },
      {
        flags: 0,
        justification: 'left',
        name: 'City Text Box',
        type: 'text',
      },
      {
        flags: 393216,
        justification: 'left',
        name: 'Country Combo Box',
        options: [
          'Austria',
          'Belgium',
          'Britain',
          'Bulgaria',
          'Croatia',
          'Cyprus',
          'Czech-Republic',
          'Denmark',
          'Estonia',
          'Finland',
          'France',
          'Germany',
          'Greece',
          'Hungary',
          'Ireland',
          'Italy',
          'Latvia',
          'Lithuania',
          'Luxembourg',
          'Malta',
          'Netherlands',
          'Poland',
          'Portugal',
          'Romania',
          'Slovakia',
          'Slovenia',
          'Spain',
          'Sweden',
        ],
        title: 'Use selection or write country name',
        type: 'choice',
      },
      {
        defaultValue: 'Man',
        flags: 131072,
        justification: 'left',
        name: 'Gender List Box',
        options: ['Man', 'Woman'],
        title: 'Select from list',
        type: 'choice',
        value: 'Man',
      },
      {
        defaultValue: '150',
        flags: 0,
        justification: 'left',
        name: 'Height Formatted Field',
        title: 'Value from 40 to 250 cm',
        type: 'text',
        value: '150',
      },
      {
        defaultValue: 'Off',
        flags: 0,
        justification: 'left',
        name: 'Driving License Check Box',
        options: ['Off', 'Yes'],
        title: 'Car driving license',
        type: 'button',
        value: 'Off',
      },
      {
        defaultValue: 'Off',
        flags: 0,
        justification: 'left',
        name: 'Language 1 Check Box',
        options: ['Off', 'Yes'],
        type: 'button',
        value: 'Off',
      },
      {
        defaultValue: 'Yes',
        flags: 0,
        justification: 'left',
        name: 'Language 2 Check Box',
        options: ['Off', 'Yes'],
        type: 'button',
        value: 'Yes',
      },
      {
        defaultValue: 'Off',
        flags: 0,
        justification: 'left',
        name: 'Language 3 Check Box',
        options: ['Off', 'Yes'],
        type: 'button',
        value: 'Off',
      },
      {
        defaultValue: 'Off',
        flags: 0,
        justification: 'left',
        name: 'Language 4 Check Box',
        options: ['Off', 'Yes'],
        type: 'button',
        value: 'Off',
      },
      {
        defaultValue: 'Off',
        flags: 0,
        justification: 'left',
        name: 'Language 5 Check Box',
        options: ['Off', 'Yes'],
        type: 'button',
        value: 'Off',
      },
      {
        defaultValue: 'Red',
        flags: 131072,
        justification: 'left',
        name: 'Favourite Colour List Box',
        options: ['Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Grey', 'White'],
        title: 'Select from colour spectrum',
        type: 'choice',
        value: 'Red',
      },
    ]);
  });
});
