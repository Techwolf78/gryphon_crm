const tasksData = [
  {
    account: 'ICEM',
    roles: [
      {
        name: 'Social Media',
        tasks: [
          'Pre Training',
          'Post Training',
          'Pre Placement',
          'Post Placement Drive',
          'Placement after Drive Creative',
          'Festival Creatives',
          'Reel cover page',
          'Google banners',
          'Linkedin banners',
          'Whats app Creatives',
          'Blog cover page',
          'Hiring Creative',
          'Emplyoee Creatives',
          'Post Event Creative',
          'Pre event Creatives',
          'Admission Creatives',
          'Emailers design',
          'Content Creatives',
          'Emergancy Creative',
          'Festival Reel',
          'Training Reel',
          'Placement Reel',
          'Internal Branding Reel',
          'Content Creation',
          'Motion Videos',
          'Pre Training Content',
          'Post Training Content',
          'Pre Placement Content',
          'Post Placement Drive Content',
          'Placement after Drive Creative Content',
          'Festival Creatives Content',
          'Reel cover page Content',
          'Google banners Content',
          'Linkedin banners Content',
          'Whats app Creatives Content',
          'Blog cover page Content',
          'Hiring Creative Content',
          'Emplyoee Creatives Content',
          'Post Event Creative Content',
          'Pre event Creatives Content',
          'Admission Creatives Content',
          'Emailers Content',
          'Content Creatives Content',
          'Caption',
          'LinkedIn Comments',
          'Linkedin Repost',
          'Posting',
          'Festival Reel Script',
          'Training Reel Script',
          'Placement Reel Script',
          'Internal Branding Reel Script',
          'Content Creation Script',
          'Motion Videos Script',
          'Proofreading',
          'Pre Training Posting',
          'Post Training Posting',
          'Pre Placement Posting',
          'Post Placement Drive Posting',
          'Placement after Drive Creative Posting',
          'Festival Creatives Posting',
          'Reel cover page Posting',
          'Google banners Posting',
          'Linkedin banners Posting',
          'Whats app Creatives Posting',
          'Blog cover page Posting',
          'Hiring Creative Posting',
          'Emplyoee Creatives Posting',
          'Post Event Creative Posting',
          'Pre event Creatives Posting',
          'Admission Creatives Posting',
          'Emailers Posting',
          'Posting Creatives Posting',
          'Festival Reel Posting',
          'Training Reel Posting',
          'Placement Reel Posting',
          'Internal Branding Reel Posting',
          'Content Creation Reel Posting',
          'Motion Video Posting'
        ]
      },
      {
        name: 'Digital Media',
        tasks: [
          'Brochures',
          'Training Modules',
          'Certificates',
          'Symols, Stamp and Logos format',
          'Website images',
          'Websites Banners',
          'Website Design',
          'Trainers Profile',
          'Invites',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Proofreading',
          'Engineering Proposal',
          'MBA Proposal',
          'MCA Proposal',
          'MOU',
          'Digital Certificate',
          'BBA Proposal',
          'BCA Proposal',
          'Event Proposal',
          'Common Proposal'
        ]
      },
      {
        name: 'Print Media',
        tasks: [
          'External Hoardings',
          'Internal Hoardings',
          'Standees',
          'Newspaper',
          'Brochure',
          'Event Print Media',
          'Office Print Media',
          'Leaflet',
          'Certificates',
          'External Hoardings Content',
          'Internal Hoardings Content',
          'Standees Content',
          'Newspaper Content',
          'Brochure Content',
          'Event Print Media Content',
          'Office Print Media Content',
          'Proofreading'
        ]
      },
      {
        name: 'Event',
        tasks: [
          'Logo',
          'Invites',
          'Pre Event Creatives',
          'Post Event Creatives',
          'Agenda',
          'Concept note',
          'Sponsorship letters',
          'Backdrops',
          'AV',
          'Pre Branding Reel',
          'Post Branding Reel',
          'AV Script',
          'Pre Branding Reel Script',
          'Post Branding Reel Script',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Pre event Creatives Content',
          'Post Event Creatives Content',
          'Agenda Content',
          'Concept Note Content',
          'Invites Content',
          'Mail drafts',
          'Guest List tracker & maintenance',
          'Proofreading',
          'Event PPT',
          'Digital Backdrops',
          'Console Work',
          'LED Backdrops'
        ]
      },
      {
        name: 'Ad Videos',
        tasks: [
          'Admissions Reel',
          'Admissions Scripts'
        ]
      },
      {
        name: 'PPT',
        tasks: [
          'Content Creation PPT',
          'Sales PPT',
          'Onboarding PPT',
          'Induction PPT',
          'Pitch Deck PPT',
          'Review PPT',
          'Topic Covered PPT',
          'Interdepartment PPT'
        ]
      },
      {
        name: 'Ad campaigns',
        tasks: [
          'Ad campaigns Set up',
          'Ad campaign Optimization',
          'Lead Status tracking'
        ]
      },
      {
        name: 'Co-ordination',
        tasks: [
          'IU Team',
          'ICEM Team',
          'IGSB Team',
          'Vendors'
        ]
      },
      {
        name: 'Documentation',
        tasks: [
          'Daily Task Update',
          'Daily Report',
          'Weekly Report',
          'Expense Sheets',
          'Purchase Order',
          'Admission Research',
          'Data sorting',
          'Report Generation',
          'Data Cleaning & Standardization',
          'DM Drive Organization'
        ]
      },
      {
        name: 'IT Admin',
        tasks: [
          'Email & Account Setup',
          'Exchange 365 confuguration',
          'Powerbi Admin Panel',
          'Perview Microsoft 365 Admin Panel.'
        ]
      },
      {
        name: 'Analysis',
        tasks: [
          'Requirement Gathering',
          'Planning'
        ]
      },
      {
        name: 'WD Design',
        tasks: [
          'Design Architecture',
          'Prototype',
          'Approval'
        ]
      },
      {
        name: 'Coding',
        tasks: [
          'Source Code',
          'Frontend / Backend',
          'Collaboration'
        ]
      },
      {
        name: 'Testing',
        tasks: [
          'Unit Testing',
          'Mobile Responsive',
          'I-Pad and Tab Responsive',
          'Browser Responsive'
        ]
      },
      {
        name: 'Deployment',
        tasks: [
          'Pre-deployment check',
          'Environment setup',
          'Code Deployment',
          'Post-Deployment Testing',
          'Performance Monitoring'
        ]
      },
      {
        name: 'CRM',
        tasks: [
          'Goals & Approval',
          'Scope & Planning',
          'Team Kickoff',
          'Development & Monitoring',
          'Testing & Quality',
          'Deployment & Closure'
        ]
      },
      {
        name: 'Modification',
        tasks: [
          'Design Architecture Modification',
          'Source Code Modification',
          'Unit Testing Modification',
          'Mobile Responsive Modification',
          'I-Pad and Tab Responsive Modification',
          'Browser Responsive Modification'
        ]
      },
      {
        name: 'Content Calendar',
        tasks: [
          'Weekly content Calender'
        ]
      },
      {
        name: 'Blog Creation',
        tasks: [
          'Trending Topics',
          'Technical',
          'Branding'
        ]
      }
    ]
  },
    {
    account: 'IGSB',
    roles: [
      {
        name: 'Social Media',
        tasks: [
          'Pre Training',
          'Post Training',
          'Pre Placement',
          'Post Placement Drive',
          'Placement after Drive Creative',
          'Festival Creatives',
          'Reel cover page',
          'Google banners',
          'Linkedin banners',
          'Whats app Creatives',
          'Blog cover page',
          'Hiring Creative',
          'Emplyoee Creatives',
          'Post Event Creative',
          'Pre event Creatives',
          'Admission Creatives',
          'Emailers design',
          'Content Creatives',
          'Emergancy Creative',
          'Festival Reel',
          'Training Reel',
          'Placement Reel',
          'Internal Branding Reel',
          'Content Creation',
          'Motion Videos',
          'Pre Training Content',
          'Post Training Content',
          'Pre Placement Content',
          'Post Placement Drive Content',
          'Placement after Drive Creative Content',
          'Festival Creatives Content',
          'Reel cover page Content',
          'Google banners Content',
          'Linkedin banners Content',
          'Whats app Creatives Content',
          'Blog cover page Content',
          'Hiring Creative Content',
          'Emplyoee Creatives Content',
          'Post Event Creative Content',
          'Pre event Creatives Content',
          'Admission Creatives Content',
          'Emailers Content',
          'Content Creatives Content',
          'Caption',
          'LinkedIn Comments',
          'Linkedin Repost',
          'Posting',
          'Festival Reel Script',
          'Training Reel Script',
          'Placement Reel Script',
          'Internal Branding Reel Script',
          'Content Creation Script',
          'Motion Videos Script',
          'Proofreading',
          'Pre Training Posting',
          'Post Training Posting',
          'Pre Placement Posting',
          'Post Placement Drive Posting',
          'Placement after Drive Creative Posting',
          'Festival Creatives Posting',
          'Reel cover page Posting',
          'Google banners Posting',
          'Linkedin banners Posting',
          'Whats app Creatives Posting',
          'Blog cover page Posting',
          'Hiring Creative Posting',
          'Emplyoee Creatives Posting',
          'Post Event Creative Posting',
          'Pre event Creatives Posting',
          'Admission Creatives Posting',
          'Emailers Posting',
          'Posting Creatives Posting',
          'Festival Reel Posting',
          'Training Reel Posting',
          'Placement Reel Posting',
          'Internal Branding Reel Posting',
          'Content Creation Reel Posting',
          'Motion Video Posting'
        ]
      },
      {
        name: 'Digital Media',
        tasks: [
          'Brochures',
          'Training Modules',
          'Certificates',
          'Symols, Stamp and Logos format',
          'Website images',
          'Websites Banners',
          'Website Design',
          'Trainers Profile',
          'Invites',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Proofreading',
          'Engineering Proposal',
          'MBA Proposal',
          'MCA Proposal',
          'MOU',
          'Digital Certificate',
          'BBA Proposal',
          'BCA Proposal',
          'Event Proposal',
          'Common Proposal'
        ]
      },
      {
        name: 'Print Media',
        tasks: [
          'External Hoardings',
          'Internal Hoardings',
          'Standees',
          'Newspaper',
          'Brochure',
          'Event Print Media',
          'Office Print Media',
          'Leaflet',
          'Certificates',
          'External Hoardings Content',
          'Internal Hoardings Content',
          'Standees Content',
          'Newspaper Content',
          'Brochure Content',
          'Event Print Media Content',
          'Office Print Media Content',
          'Proofreading'
        ]
      },
      {
        name: 'Event',
        tasks: [
          'Logo',
          'Invites',
          'Pre Event Creatives',
          'Post Event Creatives',
          'Agenda',
          'Concept note',
          'Sponsorship letters',
          'Backdrops',
          'AV',
          'Pre Branding Reel',
          'Post Branding Reel',
          'AV Script',
          'Pre Branding Reel Script',
          'Post Branding Reel Script',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Pre event Creatives Content',
          'Post Event Creatives Content',
          'Agenda Content',
          'Concept Note Content',
          'Invites Content',
          'Mail drafts',
          'Guest List tracker & maintenance',
          'Proofreading',
          'Event PPT',
          'Digital Backdrops',
          'Console Work',
          'LED Backdrops'
        ]
      },
      {
        name: 'Ad Videos',
        tasks: [
          'Admissions Reel',
          'Admissions Scripts'
        ]
      },
      {
        name: 'PPT',
        tasks: [
          'Content Creation PPT',
          'Sales PPT',
          'Onboarding PPT',
          'Induction PPT',
          'Pitch Deck PPT',
          'Review PPT',
          'Topic Covered PPT',
          'Interdepartment PPT'
        ]
      },
      {
        name: 'Ad campaigns',
        tasks: [
          'Ad campaigns Set up',
          'Ad campaign Optimization',
          'Lead Status tracking'
        ]
      },
      {
        name: 'Co-ordination',
        tasks: [
          'IU Team',
          'ICEM Team',
          'IGSB Team',
          'Vendors'
        ]
      },
      {
        name: 'Documentation',
        tasks: [
          'Daily Task Update',
          'Daily Report',
          'Weekly Report',
          'Expense Sheets',
          'Purchase Order',
          'Admission Research',
          'Data sorting',
          'Report Generation',
          'Data Cleaning & Standardization',
          'DM Drive Organization'
        ]
      },
      {
        name: 'IT Admin',
        tasks: [
          'Email & Account Setup',
          'Exchange 365 confuguration',
          'Powerbi Admin Panel',
          'Perview Microsoft 365 Admin Panel.'
        ]
      },
      {
        name: 'Analysis',
        tasks: [
          'Requirement Gathering',
          'Planning'
        ]
      },
      {
        name: 'WD Design',
        tasks: [
          'Design Architecture',
          'Prototype',
          'Approval'
        ]
      },
      {
        name: 'Coding',
        tasks: [
          'Source Code',
          'Frontend / Backend',
          'Collaboration'
        ]
      },
      {
        name: 'Testing',
        tasks: [
          'Unit Testing',
          'Mobile Responsive',
          'I-Pad and Tab Responsive',
          'Browser Responsive'
        ]
      },
      {
        name: 'Deployment',
        tasks: [
          'Pre-deployment check',
          'Environment setup',
          'Code Deployment',
          'Post-Deployment Testing',
          'Performance Monitoring'
        ]
      },
      {
        name: 'CRM',
        tasks: [
          'Goals & Approval',
          'Scope & Planning',
          'Team Kickoff',
          'Development & Monitoring',
          'Testing & Quality',
          'Deployment & Closure'
        ]
      },
      {
        name: 'Modification',
        tasks: [
          'Design Architecture Modification',
          'Source Code Modification',
          'Unit Testing Modification',
          'Mobile Responsive Modification',
          'I-Pad and Tab Responsive Modification',
          'Browser Responsive Modification'
        ]
      },
      {
        name: 'Content Calendar',
        tasks: [
          'Weekly content Calender'
        ]
      },
      {
        name: 'Blog Creation',
        tasks: [
          'Trending Topics',
          'Technical',
          'Branding'
        ]
      }
    ]
  },
  {
    account: 'IU',
    roles: [
      {
        name: 'Social Media',
        tasks: [
          'Pre Training',
          'Post Training',
          'Pre Placement',
          'Post Placement Drive',
          'Placement after Drive Creative',
          'Festival Creatives',
          'Reel cover page',
          'Google banners',
          'Linkedin banners',
          'Whats app Creatives',
          'Blog cover page',
          'Hiring Creative',
          'Emplyoee Creatives',
          'Post Event Creative',
          'Pre event Creatives',
          'Admission Creatives',
          'Emailers design',
          'Content Creatives',
          'Emergancy Creative',
          'Festival Reel',
          'Training Reel',
          'Placement Reel',
          'Internal Branding Reel',
          'Content Creation',
          'Motion Videos',
          'Pre Training Content',
          'Post Training Content',
          'Pre Placement Content',
          'Post Placement Drive Content',
          'Placement after Drive Creative Content',
          'Festival Creatives Content',
          'Reel cover page Content',
          'Google banners Content',
          'Linkedin banners Content',
          'Whats app Creatives Content',
          'Blog cover page Content',
          'Hiring Creative Content',
          'Emplyoee Creatives Content',
          'Post Event Creative Content',
          'Pre event Creatives Content',
          'Admission Creatives Content',
          'Emailers Content',
          'Content Creatives Content',
          'Caption',
          'LinkedIn Comments',
          'Linkedin Repost',
          'Posting',
          'Festival Reel Script',
          'Training Reel Script',
          'Placement Reel Script',
          'Internal Branding Reel Script',
          'Content Creation Script',
          'Motion Videos Script',
          'Proofreading',
          'Pre Training Posting',
          'Post Training Posting',
          'Pre Placement Posting',
          'Post Placement Drive Posting',
          'Placement after Drive Creative Posting',
          'Festival Creatives Posting',
          'Reel cover page Posting',
          'Google banners Posting',
          'Linkedin banners Posting',
          'Whats app Creatives Posting',
          'Blog cover page Posting',
          'Hiring Creative Posting',
          'Emplyoee Creatives Posting',
          'Post Event Creative Posting',
          'Pre event Creatives Posting',
          'Admission Creatives Posting',
          'Emailers Posting',
          'Posting Creatives Posting',
          'Festival Reel Posting',
          'Training Reel Posting',
          'Placement Reel Posting',
          'Internal Branding Reel Posting',
          'Content Creation Reel Posting',
          'Motion Video Posting'
        ]
      },
      {
        name: 'Digital Media',
        tasks: [
          'Brochures',
          'Training Modules',
          'Certificates',
          'Symols, Stamp and Logos format',
          'Website images',
          'Websites Banners',
          'Website Design',
          'Trainers Profile',
          'Invites',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Proofreading',
          'Engineering Proposal',
          'MBA Proposal',
          'MCA Proposal',
          'MOU',
          'Digital Certificate',
          'BBA Proposal',
          'BCA Proposal',
          'Event Proposal',
          'Common Proposal'
        ]
      },
      {
        name: 'Print Media',
        tasks: [
          'External Hoardings',
          'Internal Hoardings',
          'Standees',
          'Newspaper',
          'Brochure',
          'Event Print Media',
          'Office Print Media',
          'Leaflet',
          'Certificates',
          'External Hoardings Content',
          'Internal Hoardings Content',
          'Standees Content',
          'Newspaper Content',
          'Brochure Content',
          'Event Print Media Content',
          'Office Print Media Content',
          'Proofreading'
        ]
      },
      {
        name: 'Event',
        tasks: [
          'Logo',
          'Invites',
          'Pre Event Creatives',
          'Post Event Creatives',
          'Agenda',
          'Concept note',
          'Sponsorship letters',
          'Backdrops',
          'AV',
          'Pre Branding Reel',
          'Post Branding Reel',
          'AV Script',
          'Pre Branding Reel Script',
          'Post Branding Reel Script',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Pre event Creatives Content',
          'Post Event Creatives Content',
          'Agenda Content',
          'Concept Note Content',
          'Invites Content',
          'Mail drafts',
          'Guest List tracker & maintenance',
          'Proofreading',
          'Event PPT',
          'Digital Backdrops',
          'Console Work',
          'LED Backdrops'
        ]
      },
      {
        name: 'Ad Videos',
        tasks: [
          'Admissions Reel',
          'Admissions Scripts'
        ]
      },
      {
        name: 'PPT',
        tasks: [
          'Content Creation PPT',
          'Sales PPT',
          'Onboarding PPT',
          'Induction PPT',
          'Pitch Deck PPT',
          'Review PPT',
          'Topic Covered PPT',
          'Interdepartment PPT'
        ]
      },
      {
        name: 'Ad campaigns',
        tasks: [
          'Ad campaigns Set up',
          'Ad campaign Optimization',
          'Lead Status tracking'
        ]
      },
      {
        name: 'Co-ordination',
        tasks: [
          'IU Team',
          'ICEM Team',
          'IGSB Team',
          'Vendors'
        ]
      },
      {
        name: 'Documentation',
        tasks: [
          'Daily Task Update',
          'Daily Report',
          'Weekly Report',
          'Expense Sheets',
          'Purchase Order',
          'Admission Research',
          'Data sorting',
          'Report Generation',
          'Data Cleaning & Standardization',
          'DM Drive Organization'
        ]
      },
      {
        name: 'IT Admin',
        tasks: [
          'Email & Account Setup',
          'Exchange 365 confuguration',
          'Powerbi Admin Panel',
          'Perview Microsoft 365 Admin Panel.'
        ]
      },
      {
        name: 'Analysis',
        tasks: [
          'Requirement Gathering',
          'Planning'
        ]
      },
      {
        name: 'WD Design',
        tasks: [
          'Design Architecture',
          'Prototype',
          'Approval'
        ]
      },
      {
        name: 'Coding',
        tasks: [
          'Source Code',
          'Frontend / Backend',
          'Collaboration'
        ]
      },
      {
        name: 'Testing',
        tasks: [
          'Unit Testing',
          'Mobile Responsive',
          'I-Pad and Tab Responsive',
          'Browser Responsive'
        ]
      },
      {
        name: 'Deployment',
        tasks: [
          'Pre-deployment check',
          'Environment setup',
          'Code Deployment',
          'Post-Deployment Testing',
          'Performance Monitoring'
        ]
      },
      {
        name: 'CRM',
        tasks: [
          'Goals & Approval',
          'Scope & Planning',
          'Team Kickoff',
          'Development & Monitoring',
          'Testing & Quality',
          'Deployment & Closure'
        ]
      },
      {
        name: 'Modification',
        tasks: [
          'Design Architecture Modification',
          'Source Code Modification',
          'Unit Testing Modification',
          'Mobile Responsive Modification',
          'I-Pad and Tab Responsive Modification',
          'Browser Responsive Modification'
        ]
      },
      {
        name: 'Content Calendar',
        tasks: [
          'Weekly content Calender'
        ]
      },
      {
        name: 'Blog Creation',
        tasks: [
          'Trending Topics',
          'Technical',
          'Branding'
        ]
      }
    ]
  },
  {
    account: 'GA',
    roles: [
      {
        name: 'Social Media',
        tasks: [
          'Pre Training',
          'Post Training',
          'Pre Placement',
          'Post Placement Drive',
          'Placement after Drive Creative',
          'Festival Creatives',
          'Reel cover page',
          'Google banners',
          'Linkedin banners',
          'Whats app Creatives',
          'Blog cover page',
          'Hiring Creative',
          'Emplyoee Creatives',
          'Post Event Creative',
          'Pre event Creatives',
          'Admission Creatives',
          'Emailers design',
          'Content Creatives',
          'Emergancy Creative',
          'Festival Reel',
          'Training Reel',
          'Placement Reel',
          'Internal Branding Reel',
          'Content Creation',
          'Motion Videos',
          'Pre Training Content',
          'Post Training Content',
          'Pre Placement Content',
          'Post Placement Drive Content',
          'Placement after Drive Creative Content',
          'Festival Creatives Content',
          'Reel cover page Content',
          'Google banners Content',
          'Linkedin banners Content',
          'Whats app Creatives Content',
          'Blog cover page Content',
          'Hiring Creative Content',
          'Emplyoee Creatives Content',
          'Post Event Creative Content',
          'Pre event Creatives Content',
          'Admission Creatives Content',
          'Emailers Content',
          'Content Creatives Content',
          'Caption',
          'LinkedIn Comments',
          'Linkedin Repost',
          'Posting',
          'Festival Reel Script',
          'Training Reel Script',
          'Placement Reel Script',
          'Internal Branding Reel Script',
          'Content Creation Script',
          'Motion Videos Script',
          'Proofreading',
          'Pre Training Posting',
          'Post Training Posting',
          'Pre Placement Posting',
          'Post Placement Drive Posting',
          'Placement after Drive Creative Posting',
          'Festival Creatives Posting',
          'Reel cover page Posting',
          'Google banners Posting',
          'Linkedin banners Posting',
          'Whats app Creatives Posting',
          'Blog cover page Posting',
          'Hiring Creative Posting',
          'Emplyoee Creatives Posting',
          'Post Event Creative Posting',
          'Pre event Creatives Posting',
          'Admission Creatives Posting',
          'Emailers Posting',
          'Posting Creatives Posting',
          'Festival Reel Posting',
          'Training Reel Posting',
          'Placement Reel Posting',
          'Internal Branding Reel Posting',
          'Content Creation Reel Posting',
          'Motion Video Posting'
        ]
      },
      {
        name: 'Digital Media',
        tasks: [
          'Brochures',
          'Training Modules',
          'Certificates',
          'Symols, Stamp and Logos format',
          'Website images',
          'Websites Banners',
          'Website Design',
          'Trainers Profile',
          'Invites',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Proofreading',
          'Engineering Proposal',
          'MBA Proposal',
          'MCA Proposal',
          'MOU',
          'Digital Certificate',
          'BBA Proposal',
          'BCA Proposal',
          'Event Proposal',
          'Common Proposal'
        ]
      },
      {
        name: 'Print Media',
        tasks: [
          'External Hoardings',
          'Internal Hoardings',
          'Standees',
          'Newspaper',
          'Brochure',
          'Event Print Media',
          'Office Print Media',
          'Leaflet',
          'Certificates',
          'External Hoardings Content',
          'Internal Hoardings Content',
          'Standees Content',
          'Newspaper Content',
          'Brochure Content',
          'Event Print Media Content',
          'Office Print Media Content',
          'Proofreading'
        ]
      },
      {
        name: 'Event',
        tasks: [
          'Logo',
          'Invites',
          'Pre Event Creatives',
          'Post Event Creatives',
          'Agenda',
          'Concept note',
          'Sponsorship letters',
          'Backdrops',
          'AV',
          'Pre Branding Reel',
          'Post Branding Reel',
          'AV Script',
          'Pre Branding Reel Script',
          'Post Branding Reel Script',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Pre event Creatives Content',
          'Post Event Creatives Content',
          'Agenda Content',
          'Concept Note Content',
          'Invites Content',
          'Mail drafts',
          'Guest List tracker & maintenance',
          'Proofreading',
          'Event PPT',
          'Digital Backdrops',
          'Console Work',
          'LED Backdrops'
        ]
      },
      {
        name: 'Ad Videos',
        tasks: [
          'Admissions Reel',
          'Admissions Scripts'
        ]
      },
      {
        name: 'PPT',
        tasks: [
          'Content Creation PPT',
          'Sales PPT',
          'Onboarding PPT',
          'Induction PPT',
          'Pitch Deck PPT',
          'Review PPT',
          'Topic Covered PPT',
          'Interdepartment PPT'
        ]
      },
      {
        name: 'Ad campaigns',
        tasks: [
          'Ad campaigns Set up',
          'Ad campaign Optimization',
          'Lead Status tracking'
        ]
      },
      {
        name: 'Co-ordination',
        tasks: [
          'IU Team',
          'ICEM Team',
          'IGSB Team',
          'Vendors'
        ]
      },
      {
        name: 'Documentation',
        tasks: [
          'Daily Task Update',
          'Daily Report',
          'Weekly Report',
          'Expense Sheets',
          'Purchase Order',
          'Admission Research',
          'Data sorting',
          'Report Generation',
          'Data Cleaning & Standardization',
          'DM Drive Organization'
        ]
      },
      {
        name: 'IT Admin',
        tasks: [
          'Email & Account Setup',
          'Exchange 365 confuguration',
          'Powerbi Admin Panel',
          'Perview Microsoft 365 Admin Panel.'
        ]
      },
      {
        name: 'Analysis',
        tasks: [
          'Requirement Gathering',
          'Planning'
        ]
      },
      {
        name: 'WD Design',
        tasks: [
          'Design Architecture',
          'Prototype',
          'Approval'
        ]
      },
      {
        name: 'Coding',
        tasks: [
          'Source Code',
          'Frontend / Backend',
          'Collaboration'
        ]
      },
      {
        name: 'Testing',
        tasks: [
          'Unit Testing',
          'Mobile Responsive',
          'I-Pad and Tab Responsive',
          'Browser Responsive'
        ]
      },
      {
        name: 'Deployment',
        tasks: [
          'Pre-deployment check',
          'Environment setup',
          'Code Deployment',
          'Post-Deployment Testing',
          'Performance Monitoring'
        ]
      },
      {
        name: 'CRM',
        tasks: [
          'Goals & Approval',
          'Scope & Planning',
          'Team Kickoff',
          'Development & Monitoring',
          'Testing & Quality',
          'Deployment & Closure'
        ]
      },
      {
        name: 'Modification',
        tasks: [
          'Design Architecture Modification',
          'Source Code Modification',
          'Unit Testing Modification',
          'Mobile Responsive Modification',
          'I-Pad and Tab Responsive Modification',
          'Browser Responsive Modification'
        ]
      },
      {
        name: 'Content Calendar',
        tasks: [
          'Weekly content Calender'
        ]
      },
      {
        name: 'Blog Creation',
        tasks: [
          'Trending Topics',
          'Technical',
          'Branding'
        ]
      }
    ]
  },
  {
    account: 'UA',
    roles: [
      {
        name: 'Social Media',
        tasks: [
          'Pre Training',
          'Post Training',
          'Pre Placement',
          'Post Placement Drive',
          'Placement after Drive Creative',
          'Festival Creatives',
          'Reel cover page',
          'Google banners',
          'Linkedin banners',
          'Whats app Creatives',
          'Blog cover page',
          'Hiring Creative',
          'Emplyoee Creatives',
          'Post Event Creative',
          'Pre event Creatives',
          'Admission Creatives',
          'Emailers design',
          'Content Creatives',
          'Emergancy Creative',
          'Festival Reel',
          'Training Reel',
          'Placement Reel',
          'Internal Branding Reel',
          'Content Creation',
          'Motion Videos',
          'Pre Training Content',
          'Post Training Content',
          'Pre Placement Content',
          'Post Placement Drive Content',
          'Placement after Drive Creative Content',
          'Festival Creatives Content',
          'Reel cover page Content',
          'Google banners Content',
          'Linkedin banners Content',
          'Whats app Creatives Content',
          'Blog cover page Content',
          'Hiring Creative Content',
          'Emplyoee Creatives Content',
          'Post Event Creative Content',
          'Pre event Creatives Content',
          'Admission Creatives Content',
          'Emailers Content',
          'Content Creatives Content',
          'Caption',
          'LinkedIn Comments',
          'Linkedin Repost',
          'Posting',
          'Festival Reel Script',
          'Training Reel Script',
          'Placement Reel Script',
          'Internal Branding Reel Script',
          'Content Creation Script',
          'Motion Videos Script',
          'Proofreading',
          'Pre Training Posting',
          'Post Training Posting',
          'Pre Placement Posting',
          'Post Placement Drive Posting',
          'Placement after Drive Creative Posting',
          'Festival Creatives Posting',
          'Reel cover page Posting',
          'Google banners Posting',
          'Linkedin banners Posting',
          'Whats app Creatives Posting',
          'Blog cover page Posting',
          'Hiring Creative Posting',
          'Emplyoee Creatives Posting',
          'Post Event Creative Posting',
          'Pre event Creatives Posting',
          'Admission Creatives Posting',
          'Emailers Posting',
          'Posting Creatives Posting',
          'Festival Reel Posting',
          'Training Reel Posting',
          'Placement Reel Posting',
          'Internal Branding Reel Posting',
          'Content Creation Reel Posting',
          'Motion Video Posting'
        ]
      },
      {
        name: 'Digital Media',
        tasks: [
          'Brochures',
          'Training Modules',
          'Certificates',
          'Symols, Stamp and Logos format',
          'Website images',
          'Websites Banners',
          'Website Design',
          'Trainers Profile',
          'Invites',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Proofreading',
          'Engineering Proposal',
          'MBA Proposal',
          'MCA Proposal',
          'MOU',
          'Digital Certificate',
          'BBA Proposal',
          'BCA Proposal',
          'Event Proposal',
          'Common Proposal'
        ]
      },
      {
        name: 'Print Media',
        tasks: [
          'External Hoardings',
          'Internal Hoardings',
          'Standees',
          'Newspaper',
          'Brochure',
          'Event Print Media',
          'Office Print Media',
          'Leaflet',
          'Certificates',
          'External Hoardings Content',
          'Internal Hoardings Content',
          'Standees Content',
          'Newspaper Content',
          'Brochure Content',
          'Event Print Media Content',
          'Office Print Media Content',
          'Proofreading'
        ]
      },
      {
        name: 'Event',
        tasks: [
          'Logo',
          'Invites',
          'Pre Event Creatives',
          'Post Event Creatives',
          'Agenda',
          'Concept note',
          'Sponsorship letters',
          'Backdrops',
          'AV',
          'Pre Branding Reel',
          'Post Branding Reel',
          'AV Script',
          'Pre Branding Reel Script',
          'Post Branding Reel Script',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Pre event Creatives Content',
          'Post Event Creatives Content',
          'Agenda Content',
          'Concept Note Content',
          'Invites Content',
          'Mail drafts',
          'Guest List tracker & maintenance',
          'Proofreading',
          'Event PPT',
          'Digital Backdrops',
          'Console Work',
          'LED Backdrops'
        ]
      },
      {
        name: 'Ad Videos',
        tasks: [
          'Admissions Reel',
          'Admissions Scripts'
        ]
      },
      {
        name: 'PPT',
        tasks: [
          'Content Creation PPT',
          'Sales PPT',
          'Onboarding PPT',
          'Induction PPT',
          'Pitch Deck PPT',
          'Review PPT',
          'Topic Covered PPT',
          'Interdepartment PPT'
        ]
      },
      {
        name: 'Ad campaigns',
        tasks: [
          'Ad campaigns Set up',
          'Ad campaign Optimization',
          'Lead Status tracking'
        ]
      },
      {
        name: 'Co-ordination',
        tasks: [
          'IU Team',
          'ICEM Team',
          'IGSB Team',
          'Vendors'
        ]
      },
      {
        name: 'Documentation',
        tasks: [
          'Daily Task Update',
          'Daily Report',
          'Weekly Report',
          'Expense Sheets',
          'Purchase Order',
          'Admission Research',
          'Data sorting',
          'Report Generation',
          'Data Cleaning & Standardization',
          'DM Drive Organization'
        ]
      },
      {
        name: 'IT Admin',
        tasks: [
          'Email & Account Setup',
          'Exchange 365 confuguration',
          'Powerbi Admin Panel',
          'Perview Microsoft 365 Admin Panel.'
        ]
      },
      {
        name: 'Analysis',
        tasks: [
          'Requirement Gathering',
          'Planning'
        ]
      },
      {
        name: 'WD Design',
        tasks: [
          'Design Architecture',
          'Prototype',
          'Approval'
        ]
      },
      {
        name: 'Coding',
        tasks: [
          'Source Code',
          'Frontend / Backend',
          'Collaboration'
        ]
      },
      {
        name: 'Testing',
        tasks: [
          'Unit Testing',
          'Mobile Responsive',
          'I-Pad and Tab Responsive',
          'Browser Responsive'
        ]
      },
      {
        name: 'Deployment',
        tasks: [
          'Pre-deployment check',
          'Environment setup',
          'Code Deployment',
          'Post-Deployment Testing',
          'Performance Monitoring'
        ]
      },
      {
        name: 'CRM',
        tasks: [
          'Goals & Approval',
          'Scope & Planning',
          'Team Kickoff',
          'Development & Monitoring',
          'Testing & Quality',
          'Deployment & Closure'
        ]
      },
      {
        name: 'Modification',
        tasks: [
          'Design Architecture Modification',
          'Source Code Modification',
          'Unit Testing Modification',
          'Mobile Responsive Modification',
          'I-Pad and Tab Responsive Modification',
          'Browser Responsive Modification'
        ]
      },
      {
        name: 'Content Calendar',
        tasks: [
          'Weekly content Calender'
        ]
      },
      {
        name: 'Blog Creation',
        tasks: [
          'Trending Topics',
          'Technical',
          'Branding'
        ]
      }
    ]
  },

  {
    account: 'SB',
    roles: [
      {
        name: 'Social Media',
        tasks: [
          'Pre Training',
          'Post Training',
          'Pre Placement',
          'Post Placement Drive',
          'Placement after Drive Creative',
          'Festival Creatives',
          'Reel cover page',
          'Google banners',
          'Linkedin banners',
          'Whats app Creatives',
          'Blog cover page',
          'Hiring Creative',
          'Emplyoee Creatives',
          'Post Event Creative',
          'Pre event Creatives',
          'Admission Creatives',
          'Emailers design',
          'Content Creatives',
          'Emergancy Creative',
          'Festival Reel',
          'Training Reel',
          'Placement Reel',
          'Internal Branding Reel',
          'Content Creation',
          'Motion Videos',
          'Pre Training Content',
          'Post Training Content',
          'Pre Placement Content',
          'Post Placement Drive Content',
          'Placement after Drive Creative Content',
          'Festival Creatives Content',
          'Reel cover page Content',
          'Google banners Content',
          'Linkedin banners Content',
          'Whats app Creatives Content',
          'Blog cover page Content',
          'Hiring Creative Content',
          'Emplyoee Creatives Content',
          'Post Event Creative Content',
          'Pre event Creatives Content',
          'Admission Creatives Content',
          'Emailers Content',
          'Content Creatives Content',
          'Caption',
          'LinkedIn Comments',
          'Linkedin Repost',
          'Posting',
          'Festival Reel Script',
          'Training Reel Script',
          'Placement Reel Script',
          'Internal Branding Reel Script',
          'Content Creation Script',
          'Motion Videos Script',
          'Proofreading',
          'Pre Training Posting',
          'Post Training Posting',
          'Pre Placement Posting',
          'Post Placement Drive Posting',
          'Placement after Drive Creative Posting',
          'Festival Creatives Posting',
          'Reel cover page Posting',
          'Google banners Posting',
          'Linkedin banners Posting',
          'Whats app Creatives Posting',
          'Blog cover page Posting',
          'Hiring Creative Posting',
          'Emplyoee Creatives Posting',
          'Post Event Creative Posting',
          'Pre event Creatives Posting',
          'Admission Creatives Posting',
          'Emailers Posting',
          'Posting Creatives Posting',
          'Festival Reel Posting',
          'Training Reel Posting',
          'Placement Reel Posting',
          'Internal Branding Reel Posting',
          'Content Creation Reel Posting',
          'Motion Video Posting'
        ]
      },
      {
        name: 'Digital Media',
        tasks: [
          'Brochures',
          'Training Modules',
          'Certificates',
          'Symols, Stamp and Logos format',
          'Website images',
          'Websites Banners',
          'Website Design',
          'Trainers Profile',
          'Invites',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Proofreading',
          'Engineering Proposal',
          'MBA Proposal',
          'MCA Proposal',
          'MOU',
          'Digital Certificate',
          'BBA Proposal',
          'BCA Proposal',
          'Event Proposal',
          'Common Proposal'
        ]
      },
      {
        name: 'Print Media',
        tasks: [
          'External Hoardings',
          'Internal Hoardings',
          'Standees',
          'Newspaper',
          'Brochure',
          'Event Print Media',
          'Office Print Media',
          'Leaflet',
          'Certificates',
          'External Hoardings Content',
          'Internal Hoardings Content',
          'Standees Content',
          'Newspaper Content',
          'Brochure Content',
          'Event Print Media Content',
          'Office Print Media Content',
          'Proofreading'
        ]
      },
      {
        name: 'Event',
        tasks: [
          'Logo',
          'Invites',
          'Pre Event Creatives',
          'Post Event Creatives',
          'Agenda',
          'Concept note',
          'Sponsorship letters',
          'Backdrops',
          'AV',
          'Pre Branding Reel',
          'Post Branding Reel',
          'AV Script',
          'Pre Branding Reel Script',
          'Post Branding Reel Script',
          'Brochures Content',
          'Training Modules Content',
          'Certificates Content',
          'Trainers Profile Content',
          'Pre event Creatives Content',
          'Post Event Creatives Content',
          'Agenda Content',
          'Concept Note Content',
          'Invites Content',
          'Mail drafts',
          'Guest List tracker & maintenance',
          'Proofreading',
          'Event PPT',
          'Digital Backdrops',
          'Console Work',
          'LED Backdrops'
        ]
      },
      {
        name: 'Ad Videos',
        tasks: [
          'Admissions Reel',
          'Admissions Scripts'
        ]
      },
      {
        name: 'PPT',
        tasks: [
          'Content Creation PPT',
          'Sales PPT',
          'Onboarding PPT',
          'Induction PPT',
          'Pitch Deck PPT',
          'Review PPT',
          'Topic Covered PPT',
          'Interdepartment PPT'
        ]
      },
      {
        name: 'Ad campaigns',
        tasks: [
          'Ad campaigns Set up',
          'Ad campaign Optimization',
          'Lead Status tracking'
        ]
      },
      {
        name: 'Co-ordination',
        tasks: [
          'IU Team',
          'ICEM Team',
          'IGSB Team',
          'Vendors'
        ]
      },
      {
        name: 'Documentation',
        tasks: [
          'Daily Task Update',
          'Daily Report',
          'Weekly Report',
          'Expense Sheets',
          'Purchase Order',
          'Admission Research',
          'Data sorting',
          'Report Generation',
          'Data Cleaning & Standardization',
          'DM Drive Organization'
        ]
      },
      {
        name: 'IT Admin',
        tasks: [
          'Email & Account Setup',
          'Exchange 365 confuguration',
          'Powerbi Admin Panel',
          'Perview Microsoft 365 Admin Panel.'
        ]
      },
      {
        name: 'Analysis',
        tasks: [
          'Requirement Gathering',
          'Planning'
        ]
      },
      {
        name: 'WD Design',
        tasks: [
          'Design Architecture',
          'Prototype',
          'Approval'
        ]
      },
      {
        name: 'Coding',
        tasks: [
          'Source Code',
          'Frontend / Backend',
          'Collaboration'
        ]
      },
      {
        name: 'Testing',
        tasks: [
          'Unit Testing',
          'Mobile Responsive',
          'I-Pad and Tab Responsive',
          'Browser Responsive'
        ]
      },
      {
        name: 'Deployment',
        tasks: [
          'Pre-deployment check',
          'Environment setup',
          'Code Deployment',
          'Post-Deployment Testing',
          'Performance Monitoring'
        ]
      },
      {
        name: 'CRM',
        tasks: [
          'Goals & Approval',
          'Scope & Planning',
          'Team Kickoff',
          'Development & Monitoring',
          'Testing & Quality',
          'Deployment & Closure'
        ]
      },
      {
        name: 'Modification',
        tasks: [
          'Design Architecture Modification',
          'Source Code Modification',
          'Unit Testing Modification',
          'Mobile Responsive Modification',
          'I-Pad and Tab Responsive Modification',
          'Browser Responsive Modification'
        ]
      },
      {
        name: 'Content Calendar',
        tasks: [
          'Weekly content Calender'
        ]
      },
      {
        name: 'Blog Creation',
        tasks: [
          'Trending Topics',
          'Technical',
          'Branding'
        ]
      }
    ]
  }
];

export default tasksData;