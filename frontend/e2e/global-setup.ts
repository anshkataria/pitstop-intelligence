import { request, type FullConfig } from '@playwright/test';
import { TEST_USER } from './fixtures';

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL as string;
  const api = await request.newContext({ baseURL });
  try {
    const response = await api.post('/api/v1/auth/register', { data: TEST_USER });
    if (response.status() !== 201 && response.status() !== 409) {
      throw new Error(
        `Could not prepare the E2E account: ${response.status()} ${await response.text()}`,
      );
    }
  } finally {
    await api.dispose();
  }
}
