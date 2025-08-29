import React from 'react'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import routes from './routes/routes';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {routes.map((route, index)=>{
          return(
            <Route key={index} path={route.path} element={<route.element/>}></Route>
          )
        })}
      </Routes>
    </BrowserRouter>
  )
}

export default App