/**
 * Theme constants module
 * Provides consistent theme-based styling throughout the application
 * Adapts styles based on light/dark mode
 */

import { useTheme } from '../../contexts/ThemeContext';

/**
 * Custom hook to access theme-based styling constants
 * Provides comprehensive set of styles for components
 * 
 * @returns {Object} Theme styling constants including:
 * - Background colors
 * - Text colors
 * - Input styling
 * - Button styling
 * - UI element styling
 */
export const useThemeConstants = () => {
  const theme = useTheme();
  const isDarkMode = theme ? theme.isDarkMode : false;

  return {
    // Main background and text colors
    mainBackgroundColor: isDarkMode ? 'bg-gray-900' : 'bg-white',
    mainTextColor: isDarkMode ? 'text-white' : 'text-gray-900',
    
    // Heading text color
    headingTextColor: isDarkMode ? 'text-white' : 'text-gray-900',
    headingTextColor2: isDarkMode ? 'white' : 'black', // Without text for icons
    
    // Section background color
    sectionBackgroundColor: isDarkMode ? 'bg-gray-800' : 'bg-white',
    borderColor: isDarkMode ? 'border-gray-600' : 'border-gray-300',
    
    // Input styling
    inputBackgroundColor: isDarkMode ? 'bg-gray-700' : 'bg-gray-100',
    inputTextColor: isDarkMode ? 'text-white' : '',
    inputBorderColor: isDarkMode ? 'border-gray-600' : 'border-gray-300',
    inputPlaceholderColor: isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500',
    
    // Button styling
    buttonBackgroundColor: isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500',
    buttonBorderColor: isDarkMode ? 'border-white' : 'border-black',
    buttonHoverColor: isDarkMode ? 'hover:bg-indigo-700' : 'hover:bg-indigo-600',
    secondaryButtonBackgroundColor: isDarkMode ? 'bg-gray-600' : 'bg-gray-300',
    secondaryButtonHoverColor: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-400',
    primaryButtonBackgroundColor: isDarkMode ? 'bg-green-600' : 'bg-green-500',
    primaryButtonHoverColor: isDarkMode ? 'hover:bg-green-700' : 'hover:bg-green-600',
    selectedItemTextColor: 'text-white',
    
    // Other UI element styling
    labelTextColor: isDarkMode ? 'text-gray-300' : 'text-gray-700',
    tagBackgroundColor: isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white',
    footerBackgroundColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-200',
    footerTextColor: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    modalBackgroundColor: isDarkMode ? 'bg-gray-800/40' : 'bg-white/40',
    linkTextColor: isDarkMode ? 'text-indigo-300' : 'text-indigo-600',
    linkHoverColor: isDarkMode ? 'hover:text-indigo-200' : 'hover:text-indigo-800',
    unselectedItemBackgroundColor: isDarkMode ? 'bg-gray-700' : 'bg-gray-100',
    unselectedItemHoverColor: isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300',
    labelAccentColor: isDarkMode ? 'text-indigo-300' : 'text-indigo-600',

    // Table specific colors
    tableHeaderBackground: isDarkMode ? 'bg-gray-700' : 'bg-gray-50',
    tableRowEvenBackground: isDarkMode ? 'bg-gray-800' : 'bg-white',
    tableRowOddBackground: isDarkMode ? 'bg-gray-700' : 'bg-gray-50',
    
    // Debug info specific
    debugBackground: isDarkMode ? 'bg-gray-800' : 'bg-gray-100',
    debugText: isDarkMode ? 'text-gray-200' : 'text-gray-800',
    
    // Code/Pre blocks
    codeBlockBackground: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    codeBlockText: isDarkMode ? 'text-gray-200' : 'text-gray-800',

    // Warnings
    warningBackgroundColor: isDarkMode ? 'bg-amber-900/30' : 'bg-red-900',
    warningBorderColor: isDarkMode ? 'border-amber-700/50' : 'border-red-700',
    warningTextColor: isDarkMode ? 'text-amber-200' : 'text-white',
    warningIconColor: isDarkMode ? 'text-amber-400' : 'text-white',
    warningHeadingColor: isDarkMode ? 'text-amber-300' : 'text-white',
    warningMutedTextColor: isDarkMode ? 'text-amber-400' : 'text-white/90',
  };
};

export default useThemeConstants;