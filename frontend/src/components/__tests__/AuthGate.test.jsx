import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockValidateGirderToken, mockSetGirderToken, mockGetGirderToken } = vi.hoisted(() => ({
    mockValidateGirderToken: vi.fn(),
    mockSetGirderToken: vi.fn(),
    mockGetGirderToken: vi.fn(),
}));

vi.mock('../../config', async () => {
    const actual = await vi.importActual('../../config');
    return {
        ...actual,
        getGirderToken: mockGetGirderToken,
        setGirderToken: mockSetGirderToken,
        validateGirderToken: mockValidateGirderToken,
    };
});

vi.mock('../Dashboard', () => ({
    default: () => <div>Dashboard</div>,
}));

vi.mock('../LoginPage', () => ({
    default: () => <div>Login Page</div>,
}));

import AuthGate from '../AuthGate';

describe('AuthGate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({}, '', '/');
    });

    it('shows the login page when the token is invalid', async () => {
        mockGetGirderToken.mockReturnValue(null);
        mockValidateGirderToken.mockResolvedValue({ valid: false, user: null });

        render(<AuthGate />);

        await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
    });

    it('stores a token from the URL and shows the dashboard when it validates', async () => {
        window.history.replaceState({}, '', '/?girderToken=abc123');
        mockGetGirderToken.mockReturnValue(null);
        mockValidateGirderToken.mockResolvedValue({ valid: true, user: { name: 'A' } });

        render(<AuthGate />);

        await waitFor(() => expect(mockSetGirderToken).toHaveBeenCalledWith('abc123'));
        await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    });
});
