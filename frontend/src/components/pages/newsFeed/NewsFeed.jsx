import React from 'react'
import MenuBar from '../../MenuBar'
import './newsFeed.css'
import DiffSportsMenu from './DiffSportsMenu'

function newsFeed() {
  return (
    <div className='newsContainer'>
      <div className='menu-Container-news'>
        {/* <div className='backPage'>
        <a href="/" class="button-35">&laquo; Back To Main Menu</a>
        <DiffSportsMenu/>
        </div> */}
        <DiffSportsMenu/>
        
        
      </div>

  
    </div>
  )
}

export default newsFeed
