export type JiraEnv = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  projectName: string;
};

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export function getJiraEnv(): JiraEnv {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, "").trim();
  const email = process.env.JIRA_EMAIL?.trim();
  const apiToken = process.env.JIRA_API_TOKEN?.trim();
  const projectKey = process.env.JIRA_PROJECT_KEY?.trim();
  const projectName = process.env.JIRA_PROJECT_NAME?.trim() || "Soporte";

  const missing: string[] = [];
  if (!baseUrl) missing.push("JIRA_BASE_URL");
  if (!email) missing.push("JIRA_EMAIL");
  if (!apiToken) missing.push("JIRA_API_TOKEN");
  if (!projectKey) missing.push("JIRA_PROJECT_KEY");

  if (missing.length > 0) {
    throw new EnvError(
      `Faltan variables de entorno: ${missing.join(", ")}. Copiá .env.example a .env.local y completá los valores.`,
    );
  }

  return {
    baseUrl: baseUrl!,
    email: email!,
    apiToken: apiToken!,
    projectKey: projectKey!,
    projectName,
  };
}

export function hasJiraEnv(): boolean {
  try {
    getJiraEnv();
    return true;
  } catch {
    return false;
  }
}
