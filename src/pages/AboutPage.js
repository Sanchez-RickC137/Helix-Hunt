import React from 'react';
import { useThemeConstants } from '../components/Page/ThemeConstants';
import { Search, Database, Download, Users, Sparkles, Clock } from 'lucide-react';

const AboutPage = () => {
  const themeConstants = useThemeConstants();

  const features = [
    {
      icon: <Search size={24} />,
      title: "Advanced Search Capabilities",
      description: "Dual search modes offering both targeted precision and broad exploration. Use specific gene names and variation IDs for direct lookups, or conduct general searches across multiple criteria."
    },
    {
      icon: <Database size={24} />,
      title: "Dual Data Sources",
      description: "Query both live ClinVar web data and our optimized local database. Web queries provide real-time updates, while database queries offer faster response times for frequently accessed variants."
    },
    {
      icon: <Download size={24} />,
      title: "Flexible Export Options",
      description: "Export your findings in CSV, TSV, or XML formats. Preview results before downloading and choose the format that best suits your workflow."
    },
    {
      icon: <Users size={24} />,
      title: "Personalized Experience",
      description: "Save frequently used gene names and variation IDs to your preferences. Track your recent queries and quickly rerun previous searches."
    },
    {
      icon: <Sparkles size={24} />,
      title: "Advanced Filtering",
      description: "Filter results by clinical significance, date ranges, and multiple other parameters. Refine your searches to find exactly what you need."
    },
    {
      icon: <Clock size={24} />,
      title: "Regular Updates",
      description: "Our database is automatically synchronized with ClinVar's latest releases, ensuring you always have access to up-to-date genetic variation data."
    }
  ];

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className={`text-4xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
          About HelixHunt
        </h1>
        <p className="text-xl mb-8 max-w-3xl mx-auto">
          HelixHunt is a modern platform designed to streamline genetic variation research by providing intuitive access to ClinVar data through both web-based and database-driven queries.
        </p>
      </section>

      {/* Mission Section */}
      <section className={`mb-16 p-8 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Our Mission</h2>
        <p className="mb-4">
          Our mission is to empower researchers, clinicians, and genetic specialists with efficient tools for exploring and analyzing genetic variations. We aim to make complex genomic data more accessible and actionable through:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Streamlined access to ClinVar's comprehensive genetic variation database</li>
          <li>Intelligent search capabilities that support both precise and broad queries</li>
          <li>User-friendly interfaces that simplify complex data exploration</li>
          <li>Robust data management tools for organizing and retrieving findings</li>
        </ul>
      </section>

      {/* Features Grid */}
      <section className="mb-16">
        <h2 className={`text-2xl font-semibold mb-8 ${themeConstants.headingTextColor}`}>Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`p-6 rounded-lg ${themeConstants.unselectedItemBackgroundColor}`}
            >
              <div className={`${themeConstants.labelAccentColor} mb-4`}>
                {feature.icon}
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${themeConstants.headingTextColor}`}>
                {feature.title}
              </h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Details */}
      <section className={`mb-16 p-8 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Technical Implementation</h2>
        <div className="space-y-4">
          <p>
            HelixHunt is built with modern web technologies and follows best practices for performance and reliability:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>React-based frontend with Tailwind CSS for responsive design</li>
            <li>Express.js backend with optimized database queries</li>
            <li>Automated weekly updates from ClinVar's latest releases</li>
            <li>Secure user authentication and data management</li>
            <li>Efficient data processing and filtering capabilities</li>
          </ul>
        </div>
      </section>

      {/* Future Development */}
      <section className="mb-16">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Future Development</h2>
        <p className="mb-4">
          We are continuously working to enhance HelixHunt's capabilities. Our development roadmap includes:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Integration with additional genomic databases</li>
          <li>Advanced visualization tools for genetic variation data</li>
          <li>Collaborative features for research teams</li>
          <li>Enhanced data export and reporting capabilities</li>
          <li>Machine learning-powered search recommendations</li>
        </ul>
      </section>

      {/* Data Attribution */}
      <section className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor} text-center`}>
        <p className="text-sm">
          HelixHunt utilizes data from ClinVar, a public archive of reports of relationships among human variations and phenotypes, with supporting evidence. We are committed to providing the most up-to-date and accurate information available.
        </p>
      </section>
    </div>
  );
};

export default AboutPage;