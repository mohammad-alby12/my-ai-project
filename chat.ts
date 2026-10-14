export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  /** true while this assistant message is still receiving tokens */
  streaming?: boolean;
  /** set if generation failed or was stopped */
  status?: "ok" | "error" | "stopped";
}
