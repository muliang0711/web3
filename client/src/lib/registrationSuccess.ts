const REGISTRATION_SUCCESS_STORAGE_KEY = 'registrationSuccessState';

type RegistrationSuccessState = {
  name?: string;
  walletAddress?: string;
};

export function setRegistrationSuccessState(state: RegistrationSuccessState) {
  sessionStorage.setItem(REGISTRATION_SUCCESS_STORAGE_KEY, JSON.stringify(state));
}

export function getRegistrationSuccessState(): RegistrationSuccessState | null {
  const raw = sessionStorage.getItem(REGISTRATION_SUCCESS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RegistrationSuccessState;
  } catch {
    sessionStorage.removeItem(REGISTRATION_SUCCESS_STORAGE_KEY);
    return null;
  }
}

export function clearRegistrationSuccessState() {
  sessionStorage.removeItem(REGISTRATION_SUCCESS_STORAGE_KEY);
}

