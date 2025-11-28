import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * InteractiveFeatures Component
 * Wraps your app with interactive UI enhancements:
 * - Scroll progress bar
 * - Custom cursor
 * - Dark mode toggle
 */
const InteractiveFeatures = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    // Scroll progress tracker
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            setScrollProgress(progress);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Custom cursor tracker
    useEffect(() => {
        const handleMouseMove = (e) => {
            setCursorPos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Dark mode persistence
    useEffect(() => {
        const saved = localStorage.getItem('portfolio-theme');
        if (saved === 'dark') {
            setIsDarkMode(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('portfolio-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('portfolio-theme', 'light');
        }
    };

    return (
        <>
            {/* Scroll Progress Bar */}
            <div
                id="scroll-progress"
                style={{ transform: `scaleX(${scrollProgress / 100})` }}
                aria-hidden="true"
            />

            {/* Custom Cursor */}
            <div
                id="custom-cursor"
                className="hidden lg:block"
                style={{
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.y}px`,
                    transform: 'translate(-50%, -50%)',
                }}
                aria-hidden="true"
            />

            {/* Dark Mode Toggle - Fixed Position */}
            <button
                onClick={toggleDarkMode}
                className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/80 backdrop-blur-md border border-purple-100 hover:bg-purple-50 transition-all duration-300 shadow-lg"
                aria-label="Toggle dark mode"
            >
                {isDarkMode ? (
                    <Sun className="w-5 h-5 text-purple-700" />
                ) : (
                    <Moon className="w-5 h-5 text-purple-700" />
                )}
            </button>

            {/* Your app content */}
            {children}
        </>
    );
};

export default InteractiveFeatures;
