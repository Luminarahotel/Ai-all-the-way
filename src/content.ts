// ALL business facts and fact-dependent wording live in this file.
// Components import from here. Empty address / email are simply not rendered.

export type Finish = 'silver' | 'graphite' | 'gold'

export const business = {
  brand: 'LUMO RING',
  company: 'Infocreon Solutions Private Limited',
  year: 2026,
  address: '', // supply to show it in the footer
  email: '', // supply to show it in the footer and the privacy block
  launchWording: 'when LUMO RING is ready to order',
  disclaimer: 'LUMO RING is a fictional brand used for this demonstration.',
}

export const copy = {
  skip: 'Skip to content',
  cta: 'Join the waitlist',
  hero: {
    eyebrow: 'A smart ring for sleep and recovery',
    title: 'Sleep, without the noise.',
    sub: 'One quiet reading each morning. No dashboard to study, nothing to scroll.',
  },
  problem: {
    lines: [
      'Most sleep trackers hand you a dashboard.',
      'Charts, scores, streaks and badges.',
      'You only wanted to know if you rested.',
      'Not to study your night like an exam.',
    ],
  },
  anatomy: {
    title: 'Three layers. Nothing extra.',
    intro: 'LUMO RING comes apart into the three parts that make it. Here they are.',
    layers: [
      {
        name: 'Outer shell',
        text: 'The visible band, in three finishes. Sizes will be confirmed before launch.',
      },
      {
        name: 'Sensor band',
        text: 'Sits against the skin on the inside of the ring. The full sensor list will be published before launch.',
      },
      {
        name: 'Battery arc',
        text: 'A slim cell inside the band. Capacity and tested battery life will be published once testing is complete.',
      },
    ],
  },
  science: {
    title: 'A night, drawn as one line.',
    body: 'Sleep moves between four stages: Awake, REM, Light and Deep. LUMO RING is built around showing that movement as a single, readable shape.',
    validation: 'Our validation method and results will be published before launch.',
    caption: 'Illustration of a sleep-stage line. This is not measured data.',
    stages: ['Awake', 'REM', 'Light', 'Deep'],
  },
  materials: {
    title: 'Pick a finish.',
    intro: 'Three finishes. The ring on screen changes with your choice.',
    label: 'Finish',
    note: 'Finishes are shown as renderings. Real colour and texture may differ.',
    finishes: [
      { id: 'silver' as Finish, name: 'Silver', text: 'Silver. Cool and bright, it catches light along the edges.' },
      { id: 'graphite' as Finish, name: 'Graphite', text: 'Graphite. Dark and calm, it stays out of the way.' },
      { id: 'gold' as Finish, name: 'Gold', text: 'Gold. Warm and soft, like a lamp left on in another room.' },
    ],
  },
  how: {
    title: 'Three steps. No routine to learn.',
    steps: [
      { name: 'Put it on', text: 'Wear LUMO RING on your finger, like any other ring.' },
      { name: 'Sleep', text: 'Go to bed as you normally do. The ring is made to stay out of your way.' },
      { name: 'Read one line', text: 'In the morning, read a single line about how you recovered.' },
    ],
  },
  waitlist: {
    title: 'Be the first to know.',
    sub: `We will write to you once, ${business.launchWording}.`,
    label: 'Email address',
    hint: 'One email, used only to announce launch. No newsletter.',
    button: 'Join the waitlist',
    sending: 'Sending...',
    invalid: 'Enter an email address in the form name@domain.',
    success: `You are on the list. We will write once, ${business.launchWording}.`,
    demo: 'Form works. Nothing was saved.',
    demoNote: 'This build is not connected to a waitlist yet, so no email is stored.',
    error: 'That did not go through. Your email was not saved.',
    retry: 'Try again',
  },
  footer: {
    topLink: 'Back to top',
    waitlistLink: 'Waitlist',
    privacyLink: 'Privacy',
  },
  // FLAG FOR LEGAL REVIEW: describes only what this page actually does.
  privacy: {
    title: 'Privacy',
    paragraphs: [
      'This page has one form. If you join the waitlist, we collect one thing: your email address.',
      `We use it only to tell you ${business.launchWording}. We do not send a newsletter, and we do not sell or share your email address.`,
      'This page sets no cookies and runs no analytics. Its fonts are served from this site.',
      'To have your email address deleted, ask us and we will remove it.',
    ],
  },
}
