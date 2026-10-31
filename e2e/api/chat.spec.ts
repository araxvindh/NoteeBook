import { test, expect } from "@playwright/test";

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("http://localhost:8000/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response).toBeOK();
});
