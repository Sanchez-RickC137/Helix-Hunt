import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const MaintenanceWarning = () => {
  const themeConstants = useThemeConstants();

  return (
    <div className={`${themeConstants.warningBackgroundColor} border ${themeConstants.warningBorderColor} rounded-lg p-4 mb-6`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className={`h-5 w-5 ${themeConstants.warningIconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${themeConstants.warningHeadingColor}`}>
            Database Maintenance Period
          </h3>
          <div className={`mt-2 text-sm ${themeConstants.warningTextColor}`}>
            <p>The database is currently undergoing scheduled maintenance (Saturday 23:00 - Sunday 02:00). During this time:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Database queries are temporarily disabled</li>
              <li>Gene symbol-only searches are unavailable</li>
              <li>Please include additional search criteria (DNA change or protein change) with gene symbols</li>
              <li>Web queries remain available for all other searches</li>
            </ul>
          </div>
          <div className={`mt-3 flex items-center text-sm ${themeConstants.warningMutedTextColor}`}>
            <Clock className="mr-1.5 h-4 w-4" />
            <span>Maintenance window: Saturday 23:00 - Sunday 02:00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceWarning;