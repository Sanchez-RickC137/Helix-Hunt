// import React, { useState } from 'react';
// import { Plus, X } from 'lucide-react';

// const GenePreferences = () => {
//   const [geneSearch, setGeneSearch] = useState('');
//   const [variantInput, setVariantInput] = useState('');
//   const [genePreferences, setGenePreferences] = useState([]);
//   const [variantPreferences, setVariantPreferences] = useState([]);

//   const addGenePreference = () => {
//     if (geneSearch && !genePreferences.includes(geneSearch)) {
//       setGenePreferences([...genePreferences, geneSearch]);
//       setGeneSearch('');
//     }
//   };

//   const addVariantPreference = () => {
//     const variantNumber = parseInt(variantInput, 10);
//     if (!isNaN(variantNumber) && !variantPreferences.includes(variantNumber)) {
//       setVariantPreferences([...variantPreferences, variantNumber]);
//       setVariantInput('');
//     }
//   };

//   const removeGenePreference = (gene) => {
//     setGenePreferences(genePreferences.filter(g => g !== gene));
//   };

//   const removeVariantPreference = (variant) => {
//     setVariantPreferences(variantPreferences.filter(v => v !== variant));
//   };

//   return (
//     <div className="flex space-x-4">
//       <div className="w-1/2">
//         <h3 className="text-lg font-semibold mb-2">Gene Preferences</h3>
//         <div className="flex mb-2">
//           <input
//             type="text"
//             value={geneSearch}
//             onChange={(e) => setGeneSearch(e.target.value)}
//             placeholder="Search for a gene"
//             className="flex-grow mr-2 px-2 py-1 border rounded"
//           />
//           <button 
//             onClick={addGenePreference}
//             className="flex items-center justify-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
//           >
//             <Plus size={18} />
//             <span className="ml-1">Add</span>
//           </button>
//         </div>
//         <ul className="list-disc pl-5">
//           {genePreferences.map((gene, index) => (
//             <li key={index} className="flex justify-between items-center mb-1">
//               {gene}
//               <button 
//                 onClick={() => removeGenePreference(gene)}
//                 className="flex items-center justify-center px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
//               >
//                 <X size={18} />
//                 <span className="ml-1">Remove</span>
//               </button>
//             </li>
//           ))}
//         </ul>
//       </div>
//       <div className="w-1/2">
//         <h3 className="text-lg font-semibold mb-2">Variant Preferences</h3>
//         <div className="flex mb-2">
//           <input
//             type="text"
//             value={variantInput}
//             onChange={(e) => setVariantInput(e.target.value)}
//             placeholder="Enter a variant number"
//             className="flex-grow mr-2 px-2 py-1 border rounded"
//           />
//           <button 
//             onClick={addVariantPreference}
//             className="flex items-center justify-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
//           >
//             <Plus size={18} />
//             <span className="ml-1">Add</span>
//           </button>
//         </div>
//         <ul className="list-disc pl-5">
//           {variantPreferences.map((variant, index) => (
//             <li key={index} className="flex justify-between items-center mb-1">
//               {variant}
//               <button 
//                 onClick={() => removeVariantPreference(variant)}
//                 className="flex items-center justify-center px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
//               >
//                 <X size={18} />
//                 <span className="ml-1">Remove</span>
//               </button>
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default GenePreferences;