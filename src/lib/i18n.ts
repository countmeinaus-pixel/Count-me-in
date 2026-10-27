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
    authSubtitle: 'Sign in with your email and password',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    emailRequired: 'Please enter your email address.',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    passwordRequired: 'Please enter your password.',
    sendCode: 'Continue',
    sending: 'Signing in...',
    sixDigitCode: '6-digit code',
    enterCode: 'Enter the 6-digit code',
    codeRequired: 'Please enter the 6-digit code.',
    signIn: 'Sign in',
    checking: 'Signing in...',
    switchEmail: 'Use another email',
    language: 'Language',
    pageTitle: 'Your profile',
    uploadPhoto: 'Upload your profile photo',
    firstName: 'First name',
    firstNamePlaceholder: 'Jai',
    dateOfBirth: 'Date of birth',
    dateOfBirthPlaceholder: 'dd/mm/yyyy',
    ageLabel: 'Age',
    suburb: 'Suburb',
    suburbPlaceholder: 'Port Noarlunga',
    bio: 'Bio',
    bioPlaceholder: 'I usually like to train early in the morning or at the end of the week.',
    sports: 'Sports',
    level: 'Level',
    availability: 'Availability',
    saveProfile: 'Save profile',
    saving: 'Saving...',
    requiredMessage: 'Please complete all required fields: first name, date of birth, suburb, at least one sport, and one availability slot.',
    savePhotoHint: 'Optional: add a profile photo',
    requiredNote: 'Required fields are marked with *',
    optional: 'Optional',
    invalidDateOfBirth: 'Please enter a valid date of birth for someone 18 or older.',
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
    authSubtitle: 'Inloggen met e-mailadres en wachtwoord',
    emailLabel: 'E-mailadres',
    emailPlaceholder: 'jij@voorbeeld.com',
    emailRequired: 'Voer je e-mailadres in.',
    passwordLabel: 'Wachtwoord',
    passwordPlaceholder: 'Voer je wachtwoord in',
    passwordRequired: 'Voer je wachtwoord in.',
    sendCode: 'Verder',
    sending: 'Inloggen...',
    sixDigitCode: '6-cijferige code',
    enterCode: 'Voer de 6-cijferige code in',
    codeRequired: 'Voer de 6-cijferige code in.',
    signIn: 'Inloggen',
    checking: 'Inloggen...',
    switchEmail: 'Ander e-mailadres',
    language: 'Taal',
    pageTitle: 'Je profiel',
    uploadPhoto: 'Upload je profielfoto',
    firstName: 'Voornaam',
    firstNamePlaceholder: 'Jai',
    dateOfBirth: 'Geboortedatum',
    dateOfBirthPlaceholder: 'dd/mm/yyyy',
    ageLabel: 'Leeftijd',
    suburb: 'Woonplaats',
    suburbPlaceholder: 'Port Noarlunga',
    bio: 'Bio',
    bioPlaceholder: 'Ik ga het liefst vroeg in de ochtend of aan het einde van de week sporten.',
    sports: 'Sporten',
    level: 'Niveau',
    availability: 'Beschikbaarheid',
    saveProfile: 'Profiel opslaan',
    saving: 'Opslaan...',
    requiredMessage: 'Vul alle verplichte velden in: voornaam, geboortedatum, woonplaats, minstens één sport en één beschikbaarheid.',
    savePhotoHint: 'Optioneel: voeg een profielfoto toe',
    requiredNote: 'Verplichte velden zijn gemarkeerd met *',
    optional: 'Optioneel',
    invalidDateOfBirth: 'Voer een geldige geboortedatum in voor iemand die 18 jaar of ouder is.',
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
