const EXEC = {
  PRESIDENT: 'PRESIDENT',
  VP_STANDARDS: 'VP_STANDARDS',
  VP_COMMUNICATIONS: 'VP_COMMUNICATIONS',
  VP_FINANCE: 'VP_FINANCE',
  VP_SOCIAL: 'VP_SOCIAL',
  VP_SERVICE: 'VP_SERVICE',
  VP_SCHOLARSHIP: 'VP_SCHOLARSHIP',
  VP_MEMBERSHIP: 'VP_MEMBERSHIP',
};

const EXEC_POSITIONS = {
  PRESIDENT: { key: EXEC.PRESIDENT, exec: null, title: 'President', seats: 1 },
  VP_STANDARDS: { key: EXEC.VP_STANDARDS, exec: null, title: 'VP of Standards', seats: 1 },
  VP_COMMUNICATIONS: { key: EXEC.VP_COMMUNICATIONS, exec: null, title: 'VP of Communications & Records', seats: 1 },
  VP_FINANCE: { key: EXEC.VP_FINANCE, exec: null, title: 'VP of Finance', seats: 1 },
  VP_SOCIAL: { key: EXEC.VP_SOCIAL, exec: null, title: 'VP of Social', seats: 1 },
  VP_SERVICE: { key: EXEC.VP_SERVICE, exec: null, title: 'VP of Service', seats: 1 },
  VP_SCHOLARSHIP: { key: EXEC.VP_SCHOLARSHIP, exec: null, title: 'VP of Scholarship', seats: 1 },
  VP_MEMBERSHIP: { key: EXEC.VP_MEMBERSHIP, exec: null, title: 'VP of Membership', seats: 1 },
};

const POSITIONS = {
  SISTER_AT_LARGE: { key: 'SISTER_AT_LARGE', exec: EXEC.PRESIDENT, title: 'Sister at Large', seats: 1 },

  SERGEANT_AT_ARMS: { key: 'SERGEANT_AT_ARMS', exec: EXEC.VP_STANDARDS, title: 'Sergeant at Arms', seats: 1 },
  STANDARDS_BOARD: { key: 'STANDARDS_BOARD', exec: EXEC.VP_STANDARDS, title: 'Standards Board', seats: 4 },

  WEBMASTER: { key: 'WEBMASTER', exec: EXEC.VP_COMMUNICATIONS, title: 'Webmaster', seats: 1 },
  WEBDEV: { key: 'WEBDEV', exec: EXEC.VP_COMMUNICATIONS, title: 'Web Dev Team', seats: 3 },
  PR_DIRECTOR: { key: 'PR_DIRECTOR', exec: EXEC.VP_COMMUNICATIONS, title: 'PR Director', seats: 2 },
  BEC_REP: { key: 'BEC_REP', exec: EXEC.VP_COMMUNICATIONS, title: 'BEC Rep / External Affairs', seats: 1 },
  SPONSORSHIP_CHAIR: { key: 'SPONSORSHIP_CHAIR', exec: EXEC.VP_COMMUNICATIONS, title: 'Sponsorship Chair', seats: 1 },

  FUNDRAISING: { key: 'FUNDRAISING', exec: EXEC.VP_FINANCE, title: 'Fundraising', seats: 2 },
  MEMORABILIA: { key: 'MEMORABILIA', exec: EXEC.VP_FINANCE, title: 'Memorabilia', seats: 2 },

  SISTERHOOD: { key: 'SISTERHOOD', exec: EXEC.VP_SOCIAL, title: 'Sisterhood', seats: 2 },
  FAM_ALUM: { key: 'FAM_ALUM', exec: EXEC.VP_SOCIAL, title: 'Fam/Alum', seats: 2 },
  BANQUET: { key: 'BANQUET', exec: EXEC.VP_SOCIAL, title: 'Banquet', seats: 2 },
  POWER_PENGUIN: { key: 'POWER_PENGUIN', exec: EXEC.VP_SOCIAL, title: 'Power Penguin', seats: 1 },

  PHILANTHROPY: { key: 'PHILANTHROPY', exec: EXEC.VP_SERVICE, title: 'Philanthropy', seats: 2 },
  STEM_CHAIR: { key: 'STEM_CHAIR', exec: EXEC.VP_SERVICE, title: 'STEM Chair', seats: 1 },

  PROFESSIONAL_DEV: { key: 'PROFESSIONAL_DEV', exec: EXEC.VP_SCHOLARSHIP, title: 'Professional Development', seats: 1 },

  MEM_ED: { key: 'MEM_ED', exec: EXEC.VP_MEMBERSHIP, title: 'Mem Ed', seats: 2 },
  RECRUITMENT_BOARD: { key: 'RECRUITMENT_BOARD', exec: EXEC.VP_MEMBERSHIP, title: 'Recruitment Board', seats: 6 },
};

module.exports = { EXEC, POSITIONS, EXEC_POSITIONS };
