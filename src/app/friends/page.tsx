import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import {
    getIncomingFriendRequests,
    getOutgoingFriendRequests,
    getFriends,
} from "~/server/queries/FriendshipQueries";
import FriendsPageClient from "./FriendsPageClient";

export default async function FriendsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/");

    const [incoming, outgoing, friends] = await Promise.all([
        getIncomingFriendRequests(session.user.id),
        getOutgoingFriendRequests(session.user.id),
        getFriends(session.user.id),
    ]);

    return (
        <main className="min-h-screen bg-[#f5f5f7] px-4 py-12">
            <div className="mx-auto max-w-3xl">
                <FriendsPageClient
                    incoming={incoming}
                    outgoing={outgoing}
                    friends={friends}
                />
            </div>
        </main>
    );
}
