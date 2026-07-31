import { getClerkUser, getCurrentUser } from "@/lib/auth";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";

const Navbar = async () => {
  const [user, { role }] = await Promise.all([
    getClerkUser(),
    getCurrentUser(),
  ]);

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "";

  return (
    <div className="flex items-center justify-between p-4">
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer">
          <Image src="/message.png" alt="" width={20} height={20} />
        </div>
        <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative">
          <Image src="/announcement.png" alt="" width={20} height={20} />
          <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
            1
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">{name}</span>
          <span className="text-[10px] text-gray-500 text-right capitalize">
            {role}
          </span>
        </div>
        <UserButton
          appearance={{ elements: { userButtonAvatarBox: "w-9 h-9" } }}
        />
      </div>
    </div>
  );
};

export default Navbar;
