import React from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

export function KeyboardProviderCompat({ children }: { children: React.ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
