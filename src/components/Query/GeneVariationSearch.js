// import React, { useState } from 'react';
// import { X } from 'lucide-react';
// import { useThemeConstants } from './ThemeConstants';

// const GeneVariationSearch = ({ geneVariationIDs, setGeneVariationIDs }) => {
//   // State for input field
//   const [inputValue, setInputValue] = useState('');
  
//   // Get theme-related constants
//   const themeConstants = useThemeConstants();

//   // Handle adding a new gene variation ID
//   const handleAddID = () => {
//     if (inputValue.trim() && !geneVariationIDs.includes(inputValue.trim())) {
//       setGeneVariationIDs([...geneVariationIDs, inputValue.trim()]);
//       setInputValue('');
//     }
//   };

//   // Handle removing a gene variation ID
//   const handleRemoveID = (idToRemove) => {
//     setGeneVariationIDs(geneVariationIDs.filter(id => id !== idToRemove));
//   };

//   return (
//     <div className="mb-6">
//       <label className={`block mb-1 font-medium ${themeConstants.labelAccentColor}`}>
//         Gene Variation IDs (Optional)
//       </label>
//       <div className="flex mb-2">
//         <input
//           type="text"
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`}
//           placeholder="Enter Gene Variation ID"
//         />
//         <button
//           type="button"
//           onClick={handleAddID}
//           className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
//         >
//           Add
//         </button>
//       </div>
//       {geneVariationIDs.length > 0 && (
//         <div className="mt-2">
//           <p className={`font-medium ${themeConstants.labelTextColor}`}>Added IDs:</p>
//           <div className="flex flex-wrap gap-2 mt-1">
//             {geneVariationIDs.map((id) => (
//               <div key={id} className={`flex items-center px-3 py-1 rounded-full ${themeConstants.tagBackgroundColor}`}>
//                 {id}
//                 <button 
//                   onClick={() => handleRemoveID(id)} 
//                   className="ml-2 text-white hover:text-gray-200 focus:outline-none"
//                   aria-label={`Remove ${id}`}
//                 >
//                   <X size={14} />
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default GeneVariationSearch;