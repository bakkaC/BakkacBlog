import { useSyncExternalStore } from 'react';

import { DEFAULT_PROFILE_LABEL_TRANSFORM } from '../components/home/ProfileLabel';
import type { ProfileLabelTransform } from '../components/home/ProfileLabel';

let current: ProfileLabelTransform = DEFAULT_PROFILE_LABEL_TRANSFORM;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProfileLabelTransform(): ProfileLabelTransform {
  return current;
}

export function setProfileLabelTransform(
  transform: ProfileLabelTransform
): void {
  current = { ...transform };
  emit();
}

export function resetProfileLabelTransform(): void {
  current = DEFAULT_PROFILE_LABEL_TRANSFORM;
  emit();
}

export function useProfileLabelTransform(): ProfileLabelTransform {
  return useSyncExternalStore(
    subscribe,
    getProfileLabelTransform,
    getProfileLabelTransform
  );
}
