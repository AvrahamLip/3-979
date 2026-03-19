import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AuthGuard from "../components/AuthGuard";
import { ReactNode } from "react";

// Mock the status messages since they may use specialized UI components
vi.mock("../components/StatusMessages", () => ({
  LoadingOverlay: () => <div data-testid="loading">Loading...</div>,
  ErrorMessage: ({ message }: { message: string }) => <div data-testid="error">{message}</div>,
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock window.google
    (window as any).google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
        },
      },
    };

    // Mock fetch
    global.fetch = vi.fn();
  });

  it("should render sign-in button when not authenticated", async () => {
    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected content</div>
      </AuthGuard>
    );

    expect(screen.getByText(/כניסה למערכת/i)).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("should send 'roll' in the request body, not 'role'", async () => {
    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected content</div>
      </AuthGuard>
    );

    // Get the callback set by AuthGuard
    const handleCredentialResponse = (window as any).handleCredentialResponse;
    expect(handleCredentialResponse).toBeDefined();

    // Mock successful 200 response
    (global.fetch as any).mockResolvedValueOnce({
      status: 200,
      json: async () => ({ authorized: true }),
    });

    // Dummy ID token (Google JWT)
    const dummyToken = "header.eyJlbWFpbCI6Im9uZSIsIm5hbWUiOiJPbmUifQ==.signature";
    
    await handleCredentialResponse({ credential: dummyToken });

    // Verify fetch was called with "roll"
    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("webhook/validate"),
        expect.objectContaining({
            body: expect.stringContaining('"roll":"phone"')
        })
    );
    
    // Verify successful auth reveals content
    await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
  });

  it("should show error on 401 response", async () => {
    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected content</div>
      </AuthGuard>
    );

    const handleCredentialResponse = (window as any).handleCredentialResponse;

    // Mock 401 Unauthorized
    (global.fetch as any).mockResolvedValueOnce({
      status: 401,
      json: async () => ({ authorized: false }),
    });

    const dummyToken = "header.eyJlbWFpbCI6InRlc3RAZ21haWwuY29tIn0=.signature";
    await handleCredentialResponse({ credential: dummyToken });

    await waitFor(() => {
        expect(screen.getByText(/אין לך הרשאה לגשת לדף זה/i)).toBeInTheDocument();
    });
  });
});
