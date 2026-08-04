import SettingsForm from "@/components/forms/SettingsForm";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SettingsPage = async () => {
  await requirePermission("settings.manage");

  const settings = await prisma.setting.findMany();
  const data: Record<string, string> = {};
  for (const setting of settings) data[setting.key] = setting.value;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <SettingsForm data={data} />
    </div>
  );
};

export default SettingsPage;
