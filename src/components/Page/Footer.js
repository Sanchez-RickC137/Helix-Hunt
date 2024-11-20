import React from 'react';
import { useThemeConstants } from './ThemeConstants';
import { Mail, Heart } from 'lucide-react';

const Footer = () => {
  const themeConstants = useThemeConstants();

  return (
    <footer className={`${themeConstants.footerBackgroundColor} ${themeConstants.footerTextColor} mt-8`} style={{zIndex: 1}}>
      {/* Main Footer Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center text-center">
          {/* About Section */}
          <div className="max-w-sm">
            <h3 className="text-lg font-semibold mb-4">About HelixHunt</h3>
            <p className="text-sm">
              HelixHunt streamlines genetic variation research by providing easy access to ClinVar data 
              through an intuitive interface. Built with precision and performance in mind.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="flex justify-center">
              <a href="mailto:helixhunt@proton.me" 
                 className={`${themeConstants.linkTextColor} hover:${themeConstants.linkHoverColor} flex items-center text-sm`}>
                <Mail size={16} className="mr-2" />
                helixhunt@proton.me
              </a>
            </div>
          </div>

          {/* Resources Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://www.ncbi.nlm.nih.gov/clinvar/" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className={`${themeConstants.linkTextColor} hover:${themeConstants.linkHoverColor}`}>
                  ClinVar Database
                </a>
              </li>
              <li>
                <a href="https://www.ncbi.nlm.nih.gov/clinvar/docs/help/" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className={`${themeConstants.linkTextColor} hover:${themeConstants.linkHoverColor}`}>
                  ClinVar Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t ${themeConstants.borderColor}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center items-center space-x-4 text-sm">
            <p>&copy; 2024 HelixHunt. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;