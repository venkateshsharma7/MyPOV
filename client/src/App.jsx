import {

BrowserRouter,
Routes,
Route,
Navigate

} from "react-router-dom"

import Home from "./pages/Home"

import Landing from "./pages/Landing"

import LogEntry from "./pages/LogEntry"

import PostPage from "./pages/PostPage"

import Navbar from "./components/Navbar"

import POVs from "./pages/POVs"

import Dashboard from "./pages/Dashboard"
import Admin from "./pages/Admin"

import Recommendations from "./pages/Recommendations"

import Login from "./pages/Login"

import Register from "./pages/Register"

import PublicFeed from "./pages/PublicFeed"

import Profile from "./pages/Profile"

import Activity from "./pages/Activity"

import Trending from "./pages/Trending"

import MoviePage from "./pages/MoviePage"
import AIBot from "./pages/AIBot"
import TasteDNA from "./pages/TasteDNA"
import Splash from "./components/Splash"



/* PROTECTED ROUTE */

function ProtectedRoute({

children,
requireAdmin = false,

}){

const token = localStorage.getItem("token")
let user = null

try{
user = JSON.parse(localStorage.getItem("user") || "null")
}catch{
user = null
}

if(!token){

return <Navigate to="/login" replace />

}

if(requireAdmin && user?.role !== "admin"){

return <Navigate to="/" replace />

}

return children

}



/* ROOT ROUTE - CONDITIONAL LANDING/HOME */

function RootRoute(){

const token = localStorage.getItem("token")



if(token){

return <Home />

}



return <Landing />

}



function App(){

return(

<BrowserRouter>

<Splash />

<Navbar />



<Routes>



<Route

path="/"

element={<RootRoute />}

/>



<Route

path="/home"

element={<Navigate to="/" replace />}

/>


<Route

path="/login"

element={<Login />}

/>



<Route

path="/register"

element={<Register />}

/>



<Route

path="/log"

element={

<ProtectedRoute>

<LogEntry />

</ProtectedRoute>

}

/>



<Route

path="/dashboard"

element={

<ProtectedRoute>

<Dashboard />

</ProtectedRoute>

}

/>



<Route

path="/admin"

element={

<ProtectedRoute requireAdmin={true}>

<Admin />

</ProtectedRoute>

}

/>



<Route

path="/recommendations"

element={

<ProtectedRoute>

<Recommendations />

</ProtectedRoute>

}

/>

<Route

path="/ai"

element={

<ProtectedRoute>

<AIBot />

</ProtectedRoute>

}

/>



<Route

path="/povs"

element={

<ProtectedRoute>

<POVs />

</ProtectedRoute>

}

/>



<Route

path="/post/:id"

element={<PostPage />}

/>



<Route

path="/movie/:key"

element={<MoviePage />}

/>



<Route

path="/public"

element={<PublicFeed />}

/>



<Route

path="/user/:username"

element={<Profile />}

/>



<Route

path="/taste-dna/:username"

element={

<ProtectedRoute>

<TasteDNA />

</ProtectedRoute>

}

/>



<Route

path="/activity"

element={<Activity />}

/>



<Route

path="/trending"

element={<Trending />}

/>



</Routes>

</BrowserRouter>

)

}



export default App
