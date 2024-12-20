import React from 'react';
import { useThemeConstants } from '../components/Page/ThemeConstants';
import { 
  Compass, 
  Database, 
  Filter, 
  Download, 
  Save, 
  History,
  HelpCircle,
  Navigation2,
  Layout,
  FileText,
  Mail,
  AlertCircle
} from 'lucide-react';

const HelpCard = ({ icon: Icon, title, children, fullWidth }) => {
  const themeConstants = useThemeConstants();
  
  return (
    <div className={`${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg overflow-hidden ${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className={`p-6 ${themeConstants.unselectedItemBackgroundColor}`}>
        <div className="flex items-center">
          <Icon className={`${themeConstants.labelAccentColor} mr-3`} size={24} />
          <h2 className={`text-xl font-semibold ${themeConstants.headingTextColor}`}>{title}</h2>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

const ListSection = ({ title, items }) => {
  return (
    <div>
      <h3 className="font-medium mb-2">{title}</h3>
      <ul className="list-disc list-inside space-y-2">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const HelpPage = () => {
  const themeConstants = useThemeConstants();

  return (
    <div className={`container mx-auto px-4 py-8 ${themeConstants.mainTextColor}`}>
      <div className="text-center mb-12">
        <h1 className={`text-4xl font-bold mb-4 ${themeConstants.headingTextColor}`}>
          Help & Documentation
        </h1>
        <p className="text-lg max-w-2xl mx-auto">
          Everything you need to know about using HelixHunt effectively
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <HelpCard icon={Compass} title="Getting Started">
          <ol className="list-decimal list-inside space-y-4">
            <li>Create an account or log in to access personalized features</li>
            <li>Navigate to the Query page to begin your search</li>
            <li>Choose your query source and search type</li>
            <li>Enter your search criteria</li>
            <li>Review and analyze your results</li>
          </ol>
        </HelpCard>

        <HelpCard icon={HelpCircle} title="Help Options">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Interactive Help Menu</h3>
              <p className="mb-4">Access help features anytime through the floating help button in the bottom-right corner:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Contextual Help:</strong> Hover over elements to see explanations</li>
                <li><strong>Step-by-Step Guide:</strong> Get guided walkthrough of query setup</li>
              </ul>
            </div>
          </div>
        </HelpCard>

        <HelpCard icon={Database} title="Search Types">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ListSection 
              title="Targeted Search"
              items={[
                "Gene Symbol (e.g., BRCA1)",
                "DNA Change (e.g., c.123A>G)",
                "Protein Change (e.g., p.Lys41Arg)",
                "Variation ID"
              ]}
            />
            <ListSection 
              title="General Search"
              items={[
                "Multiple search groups",
                "Combine different criteria",
                "Broader variant discovery"
              ]}
            />
          </div>
        </HelpCard>

        <HelpCard icon={Layout} title="Query Sources">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ListSection 
              title="Web Query"
              items={[
                "Real-time data from ClinVar",
                "Most up-to-date information",
                "Comprehensive results"
              ]}
            />
            <ListSection 
              title="Database Query"
              items={[
                "Faster response times",
                "Weekly updates",
                "Optimized for frequent searches",
                "Maintenance: Saturday 23:00 - Sunday 02:00"
              ]}
            />
          </div>
        </HelpCard>

        <HelpCard icon={Download} title="Working with Results">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ListSection 
              title="View Options"
              items={[
                "Default summary view",
                "Detailed table format",
                "Raw JSON data"
              ]}
            />
            <ListSection 
              title="Export Formats"
              items={[
                "CSV for spreadsheets",
                "TSV format",
                "XML for processing"
              ]}
            />
          </div>
        </HelpCard>

        <HelpCard icon={Save} title="Account Features">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ListSection 
              title="Saved Preferences"
              items={[
                "Common gene names",
                "Frequently used variation IDs",
                "Quick access during searches"
              ]}
            />
            <ListSection 
              title="History"
              items={[
                "View recent queries",
                "One-click rerun",
                "Modify past searches"
              ]}
            />
          </div>
        </HelpCard>

        <HelpCard icon={AlertCircle} title="Large Result Handling">
          <div className="space-y-6">
            <ListSection 
              title="Gene Symbol Only Searches"
              items={[
                "Leverages both ClinVar database and local database for complete, rapid results",
                "Faster query processing for genes with many variants",
                "Automatic variant count detection",
                "Weekly synchronized data with ClinVar"
              ]}
            />
            <ListSection 
              title="Result Size Limitations"
              items={[
                "Preview disabled for results with over 1,000 assertions",
                "Large downloads (over 10,000 assertions) require confirmation",
                "Use filters to reduce result size if needed"
              ]}
            />
          </div>
        </HelpCard>

        <HelpCard icon={History} title="Best Practices">
          <div className="space-y-6">
            <ListSection 
              title="Search Strategy"
              items={[
                "Use targeted search for specific variants - it's faster and more precise",
                "Start with gene symbol alone for broad gene exploration",
                "Apply clinical significance filters to manage large result sets"
              ]}
            />
            <ListSection 
              title="Workflow Optimization"
              items={[
                "Preview results before downloading to verify query success",
                "Save commonly used variation IDs and full names to preferences",
                "Check query history to modify and refine previous searches"
              ]}
            />
          </div>
        </HelpCard>

        <HelpCard icon={Mail} title="Support" fullWidth>
          <div className="text-center">
            <p>Need additional assistance? Contact our support team at:</p>
            <p className={`mt-2 ${themeConstants.labelAccentColor} font-semibold`}>
              helixhunt@proton.me
            </p>
          </div>
        </HelpCard>
      </div>
    </div>
  );
};

export default HelpPage;