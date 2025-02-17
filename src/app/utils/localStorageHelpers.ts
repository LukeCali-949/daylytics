export function initializeLocalStorage() {
    // Check if localStorage already has data
    const existingDays = localStorage.getItem('demo_days');
    const existingConfigs = localStorage.getItem('demo_chart_configs');
    const existingCumulative = localStorage.getItem('demo_cumulativeSchema');
  
    // 🟡 1. Initialize Demo Days
    if (!existingDays) {
      const DEMO_DAYS = [
        {
          date: new Date().toISOString().split('T')[0],
          daySchema: {
            programming_hours: { value: 4, goal: 6 },
            exercise_hours: { value: 1.5, goal: 2 },
            sleep_hours: { value: 7, goal: 8 },
            reading_hours: { value: 8, goal: 10 }
          }
        },
        {
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // 1 day ago
          daySchema: {
            programming_hours: { value: 5, goal: 6 },
            exercise_hours: { value: 1, goal: 2 },
            sleep_hours: { value: 6.5, goal: 8 },
            reading_hours: { value: 7, goal: 10 }
          }
        },
        {
          date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
          daySchema: {
            programming_hours: { value: 3, goal: 6 },
            exercise_hours: { value: 2, goal: 2 },
            sleep_hours: { value: 8, goal: 8 },
            reading_hours: { value: 9, goal: 10 }
          }
        }
      ];
      localStorage.setItem('demo_days', JSON.stringify(DEMO_DAYS));
    }
  
    // 🟡 2. Initialize Demo Chart Configs
    if (!existingConfigs) {
      const DEMO_CONFIGS = {
        programming_hours: { chartType: "ProgressBar" },
        exercise_hours: { chartType: "Bar" },
        sleep_hours: { chartType: "Line" },
        reading_hours: { chartType: "ProgressCircle" }
      };;
      localStorage.setItem('demo_chart_configs', JSON.stringify(DEMO_CONFIGS));
    }
  
    // 🟡 3. Initialize Demo Cumulative Schema
    if (!existingCumulative) {
      const DEMO_CUMULATIVE = {
        programming_hours: { example: { value: 4, goal: 6 } },
        exercise_hours: { example: { value: 1.5, goal: 2 } },
        sleep_hours: { example: { value: 7, goal: 8 } },
        reading_hours: { example: { value: 8, goal: 10 } }
      };
      localStorage.setItem('demo_cumulativeSchema', JSON.stringify(DEMO_CUMULATIVE));
    }
  }
  