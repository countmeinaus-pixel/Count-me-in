import type { TourStep } from '../components/AppTour'

const startTourEvent = 'count-me-in-start-tour'

// The tour walks across pages: Home, creating an activity, joining one, chats and patches.
export const appTourSteps: TourStep[] = [
  { path: '/', target: 'home-filters', title: 'Your sports, front and centre', body: 'Filter the feed by the sports you picked. Swipe sideways to see them all.' },
  { path: '/', target: 'home-views', title: 'List, map or calendar', body: 'See what is on near you as a list, on a map, or day by day.' },
  { path: '/', target: 'home-notifications', title: 'Stay in the loop', body: 'Join requests, invites, confirmed PRs and changes to your plans show up here.' },
  { path: '/', target: 'nav-friends', title: 'Friends and your crew', body: 'Your friends, plus people near you who share your sports.' },
  { path: '/activities', target: 'create-activity', title: 'Post your own activity', body: 'Keen to do something? Tap Create activity here. Your upcoming plans, invites and past meetups are on this page too.' },
  { path: '/create', target: 'create-steps', title: 'Five quick steps', body: 'Pick a sport, set when and where, add a few details, invite friends and check it before you post.' },
  {
    path: '/create',
    target: 'create-sports',
    title: 'For example',
    body: 'Tap a sport to start. A finished callout could look like this:',
    example: {
      label: 'Freediving',
      lines: [
        'Freediving at Port Noarlunga reef',
        'Saturday 7:00 am · Port Noarlunga jetty car park',
        '3 spots · Intermediate · 5 to 10 m',
      ],
    },
  },
  { path: '/activity/3', target: 'activity-join', title: 'Join with one tap', body: 'Like what you see? Tap Count me in. Once the host accepts, you are in the group chat.' },
  { path: '/chats', target: 'nav-chats', title: 'Group chats', body: 'Every activity gets a group chat as soon as you are in. Sort out the details here.' },
  { path: '/profile/patches', target: 'patches-challenges', title: 'Challenges', body: 'Join a challenge and reach the goal before time runs out to earn a limited patch.' },
  {
    path: '/profile/patches',
    target: 'patches-mine',
    title: 'Earn real patches',
    body: 'Every meetup you confirm with a QR check-in counts. Collected patches show here and on your profile, like these:',
    patches: [
      { icon: 'shield', name: 'First meetup' },
      { icon: 'waves', name: 'Salt water' },
      { icon: 'sunrise', name: 'Early bird' },
      { icon: 'mountain', name: 'Trailhead' },
      { icon: 'users', name: 'Crew' },
      { icon: 'calendar', name: 'Regular' },
    ],
  },
  { path: '/', target: 'nav-more', title: 'Profile, patches and PRs', body: 'Your profile, patches, challenges and personal records live under More. You can restart this tour from Help.' },
]

export function startAppTour() {
  window.dispatchEvent(new Event(startTourEvent))
}

export function onStartAppTour(listener: () => void) {
  window.addEventListener(startTourEvent, listener)
  return () => window.removeEventListener(startTourEvent, listener)
}
