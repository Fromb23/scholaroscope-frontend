'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
    isSidebarOpen: boolean;
    isMobileView: boolean;
    isHovered: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
    setSidebarHover: (hovered: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Detect mobile view
    useEffect(() => {
        const checkMobileView = () => {
            setIsMobileView(window.innerWidth < 1024); // lg breakpoint
        };

        // Initial check
        checkMobileView();

        // Listen for resize
        window.addEventListener('resize', checkMobileView);

        return () => window.removeEventListener('resize', checkMobileView);
    }, []);

    const openSidebar = () => {
        setIsSidebarOpen(true);
    };
    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };
    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const setSidebarHover = (hovered: boolean) => setIsHovered(hovered);

    return (
        <SidebarContext.Provider
            value={{
                isSidebarOpen,
                isMobileView,
                isHovered,
                openSidebar,
                closeSidebar,
                toggleSidebar,
                setSidebarHover,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}