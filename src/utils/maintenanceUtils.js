export const checkMaintenanceWindow = () => {
	const now = new Date();
	const day = now.getDay();  // 6 is Saturday, 0 is Sunday
	const hour = now.getHours();
	
	// Maintenance window: Saturday 23:00 - Sunday 02:00
	return (
	  (day === 6 && hour === 23) ||          // Saturday 23:00
	  (day === 0 && (hour === 0 || hour === 1)) // Sunday 00:00-01:59
	);
  };
  
  // Helper function to format maintenance window for display
  export const MAINTENANCE_WINDOW_TEXT = "Saturday 23:00 - Sunday 02:00";