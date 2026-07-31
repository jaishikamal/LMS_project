export type AnnouncementItem = {
  id: number;
  title: string;
  description: string;
  date: string;
};

const bgClasses = [
  "bg-kamal-sky-light",
  "bg-kamal-purple-light",
  "bg-kamal-yellow-light",
];

const Announcements = ({ items }: { items: AnnouncementItem[] }) => {
  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <span className="text-xs text-gray-400">View All</span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {items.length === 0 && (
          <p className="text-sm text-gray-400">No announcements yet.</p>
        )}
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`${bgClasses[index % bgClasses.length]} rounded-md p-4`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{item.title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {item.date}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;
