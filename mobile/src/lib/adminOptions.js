export const roleOptions = [
  'pending',
  'pnm',
  'candidate',
  'candOfficer',
  'member',
  'alumni',
  'officer',
  'exec',
  'webmaster',
  'webdev',
];

export const memberStatusOptions = [
  'active',
  'inactive',
  'earlyAlumni',
  'seniorStatus',
  'co-op',
  'dropped',
];

export const scholarshipOptions = [0, 25, 50, 75, 100];

export const execPositionOptions = [
  'PRESIDENT',
  'VP_STANDARDS',
  'VP_COMMUNICATIONS',
  'VP_FINANCE',
  'VP_SOCIAL',
  'VP_SERVICE',
  'VP_SCHOLARSHIP',
  'VP_MEMBERSHIP',
];

export const positionOptions = [
  'SISTER_AT_LARGE',
  'SERGEANT_AT_ARMS',
  'STANDARDS_BOARD',
  'WEBMASTER',
  'WEBDEV',
  'PR_DIRECTOR',
  'BEC_REP',
  'SPONSORSHIP_CHAIR',
  'FUNDRAISING',
  'MEMORABILIA',
  'SISTERHOOD',
  'FAM_ALUM',
  'BANQUET',
  'POWER_PENGUIN',
  'PHILANTHROPY',
  'STEM_CHAIR',
  'PROFESSIONAL_DEV',
  'MEM_ED',
  'RECRUITMENT_BOARD',
];

export const allPositionOptions = [...execPositionOptions, ...positionOptions];

export const rsvpStatusOptions = [
  { label: 'Going', value: 'going' },
  { label: 'Maybe', value: 'maybe' },
  { label: 'Not going', value: 'notGoing' },
];

export const attendanceStatusOptions = [
  { label: 'Present', value: 'present' },
  { label: 'Excused', value: 'excused' },
  { label: 'Absent', value: 'absent' },
];