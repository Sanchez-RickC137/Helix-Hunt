const timeOperation = async (operationName, operation) => {
	const start = performance.now();
	try {
	  const result = await operation();
	  const end = performance.now();
	  console.log(`${operationName} took ${end - start} milliseconds`);
	  return result;
	} catch (error) {
	  const end = performance.now();
	  console.error(`${operationName} failed after ${end - start} milliseconds`);
	  throw error;
	}
  };
  
  export default timeOperation;