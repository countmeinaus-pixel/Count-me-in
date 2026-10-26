export type Language = 'en' | 'nl'

export const DEFAULT_LANGUAGE: Language = 'en'
export const LANGUAGE_STORAGE_KEY = 'count-me-in-language'

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return stored === 'nl' ? 'nl' : DEFAULT_LANGUAGE
}

export function setStoredLanguage(language: Language) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}

export const translations = {
  en: {
    authTitle: 'Welcome mate',
    authSubtitle: 'Sign in with a one-time email code',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    emailRequired: 'Please enter your email address to receive a code.',
    sendCode: 'Send code',
    sending: 'Sending...',
    sixDigitCode: '6-digit code',
    enterCode: 'Enter the 6-digit code',
    codeRequired: 'Please enter the 6-digit code.',
    signIn: 'Sign in',
    checking: 'Checking...',
    switchEmail: 'Use another email',
    language: 'Language',
    pageTitle: 'Your profile',
    uploadPhoto: 'Upload your profile photo',
    firstName: 'First name',
    firstNamePlaceholder: 'Jai',
    age: 'Age',
    agePlaceholder: '37',
    suburb: 'Suburb',
    suburbPlaceholder: 'Port Noarlunga',
    bio: 'Bio',
    bioPlaceholder: 'I usually like to train early in the morning or at the end of the week.',
    sports: 'Sports',
    level: 'Level',
    availability: 'Availability',
    saveProfile: 'Save profile',
    saving: 'Saving...',
    requiredMessage: 'Please complete your profile, sport level, availability, and photo first.',
    savePhotoHint: 'Add a profile photo',
    languageLabel: 'Language',
    profileLabel: 'Profile',
    photoChange: 'Change profile photo',
    logOut: 'Log out',
    updatingPhoto: 'Updating...',
    profileUpdated: 'Profile photo updated.',
    photoUpdateFailed: 'Could not update the profile photo.',
    saveFailed: 'Save failed. Please try again.',
  },
  nl: {
    authTitle: 'Welkom mate',
    authSubtitle: 'Inloggen via eenmalige e-mailcode',
    emailLabel: 'E-mailadres',
    emailPlaceholder: 'jij@voorbeeld.com',
    emailRequired: 'Voer je e-mailadres in om een code te ontvangen.',
    sendCode: 'Verstuur code',
    sending: 'Versturen...',
    sixDigitCode: '6-cijferige code',
    enterCode: 'Voer de 6-cijferige code in',
    codeRequired: 'Voer de 6-cijferige code in.',
    signIn: 'Inloggen',
    checking: 'Controleren...',
    switchEmail: 'Ander e-mailadres',
    language: 'Taal',
    pageTitle: 'Je profiel',
    uploadPhoto: 'Upload je profielfoto',
    firstName: 'Voornaam',
    firstNamePlaceholder: 'Jai',
    age: 'Leeftijd',
    agePlaceholder: '37',
    suburb: 'Woonplaats',
    suburbPlaceholder: 'Port Noarlunga',
    bio: 'Bio',
    bioPlaceholder: 'Ik ga het liefst vroeg in de ochtend of aan het einde van de week sporten.',
    sports: 'Sporten',
    level: 'Niveau',
    availability: 'Beschikbaarheid',
    saveProfile: 'Profiel opslaan',
    saving: 'Opslaan...',
    requiredMessage: 'Vul eerst je profiel, sportniveau, beschikbaarheid en foto in.',
    savePhotoHint: 'Voeg een profielfoto toe',
    languageLabel: 'Taal',
    profileLabel: 'Profiel',
    photoChange: 'Profielfoto wijzigen',
    logOut: 'Uitloggen',
    updatingPhoto: 'Bijwerken...',
    profileUpdated: 'Profielfoto bijgewerkt.',
    photoUpdateFailed: 'Foto kon niet worden bijgewerkt.',
    saveFailed: 'Opslaan is niet gelukt.',
  },
} as const

export function getTranslations(language: Language = DEFAULT_LANGUAGE) {
  return translations[language]
}
