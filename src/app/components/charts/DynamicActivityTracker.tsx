import { Card, Title } from '@tremor/react';
import { ActivityCalendar } from 'react-activity-calendar'

const data = [
    {
        date: '2025-01-23',
        count: 2,
        level: 1,
      },
      {
        date: '2025-01-24',
        count: 1,
        level: 4,
      },
      {
        date: '2025-01-25',
        count: 11,
        level: 3,
      },
      {
        date: '2025-01-26',
        count: 11,
        level: 3,
      },
      {
        date: '2025-06-26',
        count: 11,
        level: 3,
      },
      {
        date: '2025-12-31',
        count: 0,
        level: 0,
      },
  
]

export default function DynamicActivityTracker() {

  return <Card className="mb-6 w-max  rounded-lg border-2 border-gray-500 bg-[#131313] p-5 shadow-2xl h-min">
  <Title className="ml-5 text-xl font-semibold">
    Hour Worked
  </Title>
  
  <ActivityCalendar  data={data} colorScheme='dark' />
</Card>
  
}
