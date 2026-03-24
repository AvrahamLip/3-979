import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import WorkPlanPage from "../pages/WorkPlanPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

// Mock the utils
vi.mock("@/lib/attendanceUtils", async () => {
  const actual = await vi.importActual("@/lib/attendanceUtils");
  return {
    ...actual,
    getTodayIso: () => "2026-03-24",
  };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a QueryClient for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

describe("WorkPlanPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  it("renders the Work Plan page with correct header", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WorkPlanPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("תוכנית עבודה")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("חיפוש שם...")).toBeInTheDocument();
  });

  it("displays the correct relative dates in the table header", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WorkPlanPage />
      </QueryClientProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("טוען...")).not.toBeInTheDocument();
    });

    // Today is 24/03/2026
    // Use partial match or regex since labels are composite
    expect(screen.getByText(/23\/03/)).toBeInTheDocument(); // Yesterday
    expect(screen.getByText(/24\/03/)).toBeInTheDocument(); // Today
    expect(screen.getByText(/25\/03/)).toBeInTheDocument(); // Tomorrow
    expect(screen.getByText(/26\/03/)).toBeInTheDocument(); // Day after
  });

  it("shows the legend at the bottom", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WorkPlanPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/מקרא:/)).toBeInTheDocument();
    });
    expect(screen.getByText(/בבסיס/)).toBeInTheDocument();
    expect(screen.getByText(/בבית/)).toBeInTheDocument();
  });
});
