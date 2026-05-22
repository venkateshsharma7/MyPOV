import { useParams } from "react-router-dom"

import { useEffect, useState } from "react"

import PublicPostCard from "../components/PublicPostCard"

import { apiFetch } from "../api/client"

function Profile(){

const { username } = useParams()

const [profile,setProfile] = useState(null)

const [following,setFollowing] = useState(false)

const [loading,setLoading] = useState(true)

const [error,setError] = useState("")

const [followLoading,setFollowLoading] = useState(false)



const loggedUser = JSON.parse(

localStorage.getItem("user")

)



useEffect(()=>{

loadProfile()

},[username])



async function loadProfile(){

try{

setLoading(true)

setError("")



const data = await apiFetch(

`/users/${username}`

)



setProfile(data)



if(data.isFollowing !== undefined){

setFollowing(data.isFollowing)

}

}catch(err){

console.error("Profile error:",err)

setError(

err.message ||

"Failed to load profile"

)

}finally{

setLoading(false)

}

}



/* FOLLOW / UNFOLLOW */

async function toggleFollow(){

try{

setFollowLoading(true)



const data = await apiFetch(

`/users/${username}/follow`,

{
method:"POST"
}

)



setFollowing(data.following)



/* LIVE FOLLOWER UPDATE */

setProfile(prev => ({

...prev,

user:{

...prev.user,

followers:data.followersCount

}

}))

}catch(err){

console.error("Follow failed:",err)

}finally{

setFollowLoading(false)

}

}



if(loading){

return(

<div className="px-10 py-10 text-gray-400">

Loading profile...

</div>

)

}



if(error){

return(

<div className="px-10 py-10 text-red-400">

{error}

</div>

)

}



if(!profile){

return null

}



return(

<div className="px-6 md:px-10 py-10">



{/* USER HEADER */}

<div className="flex items-center justify-between mb-6">

<div>

<h1 className="text-4xl font-bold mb-2">

{profile.user.username}

</h1>



<p className="text-gray-400">

Member since{" "}

{

new Date(

profile.user.createdAt

).getFullYear()

}

</p>

</div>



{/* FOLLOW BUTTON */}

{

loggedUser?.username !==

profile.user.username && (

<button

onClick={toggleFollow}

disabled={followLoading}

className="bg-yellow-400 text-black px-4 py-2 rounded hover:scale-105 transition disabled:opacity-50"

>

{

followLoading

? "Loading..."

: following

? "Unfollow"

: "Follow"

}

</button>

)

}

</div>



{/* STATS */}

<div className="flex gap-6 mb-10 flex-wrap">

<div className="bg-[#181818] px-4 py-3 rounded">

<p className="text-sm text-gray-400">

Reviews

</p>



<p className="text-xl font-semibold">

{profile.stats.totalReviews}

</p>

</div>



<div className="bg-[#181818] px-4 py-3 rounded">

<p className="text-sm text-gray-400">

Average Rating

</p>



<p className="text-xl font-semibold">

⭐ {profile.stats.avgRating}

</p>

</div>



<div className="bg-[#181818] px-4 py-3 rounded">

<p className="text-sm text-gray-400">

Followers

</p>



<p className="text-xl font-semibold">

{profile.user.followers}

</p>

</div>



<div className="bg-[#181818] px-4 py-3 rounded">

<p className="text-sm text-gray-400">

Following

</p>



<p className="text-xl font-semibold">

{profile.user.following}

</p>

</div>

</div>



{/* REVIEWS */}

<h2 className="text-2xl font-semibold mb-6">

Public Reviews

</h2>



{

profile.reviews.length === 0 ? (

<p className="text-gray-400">

No public reviews yet.

</p>

) : (

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">

{profile.reviews.map(r => (

<PublicPostCard

key={r._id}

entry={r}

/>

))}

</div>

)

}

</div>

)

}

export default Profile