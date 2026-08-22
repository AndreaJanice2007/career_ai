/**
 * Quick-start profiles. Every name below is an O*NET element name from the
 * dataset; anything the API does not recognise is dropped when applied, so a
 * stale entry degrades quietly instead of breaking the picker.
 */
export const PRESETS = [
  {
    label: 'Software & web',
    icon: '⌨',
    software: [
      'Web platform development software',
      'Development environment software',
      'Object or component oriented development software',
      'Data base user interface and query software',
      'Program testing software',
      'Configuration management software',
      'Operating system software',
      'Web page creation and editing software',
    ],
    essential: ['Critical Thinking', 'Active Learning', 'Reading Comprehension'],
  },
  {
    label: 'Data & analytics',
    icon: '◧',
    software: [
      'Analytical or scientific software',
      'Business intelligence and data analysis software',
      'Data base user interface and query software',
      'Data mining software',
      'Data base reporting software',
      'Spreadsheet software',
      'Presentation software',
    ],
    essential: ['Mathematics', 'Critical Thinking', 'Reading Comprehension'],
  },
  {
    label: 'Healthcare',
    icon: '✚',
    software: [
      'Medical software',
      'Electronic mail software',
      'Spreadsheet software',
      'Office suite software',
      'Data base user interface and query software',
    ],
    essential: ['Science', 'Active Listening', 'Speaking', 'Monitoring'],
  },
  {
    label: 'Business & finance',
    icon: '◈',
    software: [
      'Accounting software',
      'Financial analysis software',
      'Tax preparation software',
      'Spreadsheet software',
      'Enterprise resource planning ERP software',
      'Presentation software',
    ],
    essential: ['Mathematics', 'Reading Comprehension', 'Writing'],
  },
  {
    label: 'Creative & media',
    icon: '◑',
    software: [
      'Graphics or photo imaging software',
      'Video creation and editing software',
      'Desktop publishing software',
      'Web page creation and editing software',
      'Music or sound editing software',
    ],
    essential: ['Active Listening', 'Speaking', 'Writing'],
  },
]
