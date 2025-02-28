import React, { useState, useEffect } from 'react';
import MenuBar from '../MenuBar';
import { motion, Reorder } from 'framer-motion';
import PlayerStatsModal from './PlayerStats';
import './YourRoster.css';
import { blockquote } from 'framer-motion/client';

const initialPlayers = [
    {
      id: "1",
      name: "Shai Gilgeous-Alexander",
      position: "PG, SG",
      allowedPositions: ["PG", "SG", "G", "Util-1", "Util-2"],
      teamColors: ["#007ac1", "#ef3b24"],
      portrait: "shai.jpg",
      statsImage: "shai-ps.jpg",
      jersey: "2",
      team: "Oklahoma City Thunder",
      teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Oklahoma_City_Thunder.svg/1200px-Oklahoma_City_Thunder.svg.png",
      stats: {
        rank: 2,
        gp: 53,
        pts: 32.5,
        reb: 5.1,
        ast: 6.1,
        st: 1.9,
        blk: 1.0,
      },
      upcomingGame: {
        gameDate: "February 21, 2025",
        opponent: "Utah Jazz",
        teamRecord: "OKC vs @UTA (2-0)",
        opponentLogo: "https://logos-world.net/wp-content/uploads/2020/05/Utah-Jazz-Symbol.png",
        opponentColors: ["#3E2680","#00471B"]
      },
      gameLog: [
        { date: "Feb 13", opp: "@Min", status: "L, 101-116", fanPts: "46.10", min: "34", pts: "24", reb: "8", ast: "9", st: "0", blk: "0", to: "1" },
        { date: "Feb 12", opp: "MIA", status: "W, 115-101", fanPts: "56.50", min: "38", pts: "32", reb: "5", ast: "9", st: "2", blk: "0", to: "1" },
        { date: "Feb 10", opp: "NOP", status: "W, 137-101", fanPts: "46.20", min: "31", pts: "31", reb: "1", ast: "3", st: "3", blk: "1", to: "1" },
        { date: "Feb 8", opp: "@MEM", status: "W, 125-112", fanPts: "50.00", min: "34", pts: "32", reb: "0", ast: "8", st: "0", blk: "2", to: "0" },
      ],
      advancedStats: {
        per: 28.4,
        usageRate: "31.2%",
        trueShooting: "63.5%",
        winShares: 9.4,
        boxPlusMinus: "+7.1",
        vorp: 5.6,
      },
      objectPosition: "65% center",
      imageZoom: 1,  
    },
  {
    position: "SG, SF",
    name: "Aaron Wiggins",
    allowedPositions: ["SG", "SF", "G", "F", "Util-1", "Util-2"],
    teamColors: ["#007ac1", "#ef3b24"],
    portrait: "a_wiggins.jpg",
    statsImage: "https://s.yimg.com/ny/api/res/1.2/9kqTjX9WM444XTm7Y_xcDA--/YXBwaWQ9aGlnaGxhbmRlcjt3PTEyMDA7aD04MDA-/https://media.zenfs.com/en/the-oklahoman/2a2cd92a7d89173673c4a66522225a8c",
      jersey: "21",
      team: "Oklahoma City Thunder",
      teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Oklahoma_City_Thunder.svg/1200px-Oklahoma_City_Thunder.svg.png",
      stats: {
        rank: 136,
        gp: 54,
        pts: 10.9,
        reb: 3.7,
        ast: 1.6,
        st: 0.8,
        blk: 0.2,
      },
      upcomingGame: {
        gameDate: "February 21, 2025",
        opponent: "Utah Jazz",
        teamRecord: "OKC vs @UTA (2-0)",
        opponentLogo: "https://logos-world.net/wp-content/uploads/2020/05/Utah-Jazz-Symbol.png",
        opponentColors: ["#3E2680","#00471B"]
      },
      gameLog: [
        { date: "Feb 13", opp: "@Min", status: "L, 101-116", fanPts: "18.10", min: "19", pts: "10", reb: "3", ast: "1", st: "0", blk: "1", to: "0" },
        { date: "Feb 12", opp: "MIA", status: "W, 115-101", fanPts: "24.00", min: "28", pts: "11", reb: "5", ast: "2", st: "2", blk: "0", to: "2" },
        { date: "Feb 10", opp: "NOP", status: "W, 137-101", fanPts: "33.40", min: "25", pts: "24", reb: "2", ast: "0", st: "3", blk: "0", to: "2" },
        { date: "Feb 8", opp: "@MEM", status: "W, 125-112", fanPts: "42.20", min: "38", pts: "26", reb: "11", ast: "2", st: "0", blk: "0", to: "0" },
      ],
      advancedStats: {
        per: 28.4,
        usageRate: "31.2%",
        trueShooting: "63.5%",
        winShares: 9.4,
        boxPlusMinus: "+7.1",
        vorp: 5.6,
      },
      objectPosition: "45% center",
      imageZoom: 1,  
  },
  {
    position: "PG, SG",
    name: "CJ McCollum",
    allowedPositions: ["PG", "SG", "G", "Util-1", "Util-2"],
    teamColors: ["#85714D", "#0C2340"],
    portrait: "cj.jpg",
    statsImage: "https://media.bleacherreport.com/image/upload/v1644627307/aqocbysde6vqhxlqzjmq.jpg",
    jersey: "3",
    team: "New Orleans Pelicans",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/New_Orleans_Pelicans_logo.svg/1200px-New_Orleans_Pelicans_logo.svg.png",
    stats: {
      rank: 81,
      gp: 41,
      pts: 22.5,
      reb: 3.7,
      ast: 3.7,
      st: 0.8,
      blk: 0.5,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Dalls Mavericks",
      teamRecord: "NOP vs @DAL (1-2)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/9/97/Dallas_Mavericks_logo.svg/1200px-Dallas_Mavericks_logo.svg.png",
      opponentColors: ["#00538C","#B8C4CA"]
    },
    gameLog: [
      { date: "Feb 13", opp: "SAC", status: "W, 140-133", fanPts: "52.40", min: "41", pts: "43", reb: "7", ast: "2", st: "0", blk: "0", to: "2" },
      { date: "Feb 12", opp: "SAC", status: "L, 111-119", fanPts: "20.10", min: "31", pts: "14", reb: "3", ast: "3", st: "0", blk: "0", to: "2" },
      { date: "Feb 10", opp: "@OKC", status: "L, 101-137", fanPts: "0.00", min: "0", pts: "0", reb: "0", ast: "0", st: "0", blk: "0", to: "0" },
      { date: "Feb 8", opp: "@SAC", status: "L, 118-123", fanPts: "48.70", min: "33", pts: "31", reb: "6", ast: "3", st: "1", blk: "2", to: "3" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "45% center",
    imageZoom: 1,  
  },
  {
    position: "SG, SF, PF, C",
    name: "Jalen Williams",
    allowedPositions: ["SG", "G", "SF", "PF", "F", "C-1", "C-2", "Util-1", "Util-2"],
    teamColors: ["#007ac1", "#ef3b24"],
    portrait: "jdub.jpg",
    statsImage: "https://s.yimg.com/ny/api/res/1.2/A247NKrv0FBrFS8yZV.iOg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTEyMDA7aD0xNjgw/https://media.zenfs.com/en/the-oklahoman/a9bd0198640f5cc54763519568875084",
    jersey: "8",
    team: "Oklahoma City Thunder",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Oklahoma_City_Thunder.svg/1200px-Oklahoma_City_Thunder.svg.png",
    stats: {
      rank: 22,
      gp: 51,
      pts: 21.0,
      reb: 5.5,
      ast: 5.1,
      st: 1.7,
      blk: 0.7,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Utah Jazz",
      teamRecord: "OKC vs @UTA (2-0)",
      opponentLogo: "https://logos-world.net/wp-content/uploads/2020/05/Utah-Jazz-Symbol.png",
      opponentColors: ["#3E2680","#00471B"]
    },
    gameLog: [
      { date: "Feb 13", opp: "@Min", status: "L, 101-116", fanPts: "36.10", min: "34", pts: "20", reb: "3", ast: "5", st: "1", blk: "1", to: "1" },
      { date: "Feb 12", opp: "MIA", status: "W, 115-101", fanPts: "30.70", min: "31", pts: "18", reb: "6", ast: "3", st: "1", blk: "0", to: "2" },
      { date: "Feb 10", opp: "NOP", status: "W, 137-101", fanPts: "33.50", min: "25", pts: "16", reb: "5", ast: "5", st: "2", blk: "0", to: "2" },
      { date: "Feb 8", opp: "@MEM", status: "W, 125-112", fanPts: "43.20", min: "37", pts: "25", reb: "6", ast: "6", st: "1", blk: "1", to: "4" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "48% center",
    imageZoom: 1,  
  },
  {
    position: "SF, PF",
    name: "Jaden McDaniels",
    allowedPositions: ["SF", "PF", "F", "Util-1", "Util-2"],
    teamColors: ["#9ea2a2", "#0C2340"],
    portrait: "jmcdaniels.jpg",
    statsImage: "https://hoopshype.com/wp-content/uploads/sites/92/2022/12/USATSI_19492909.jpg",
    jersey: "3",
    team: "Minnesota Timberwolves",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Minnesota_Timberwolves_logo.svg/800px-Minnesota_Timberwolves_logo.svg.png",
    stats: {
      rank: 71,
      gp: 56,
      pts: 11.5,
      reb: 5.6,
      ast: 1.8,
      st: 1.4,
      blk: 0.9,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Houston Rockets",
      teamRecord: "MIN vs @HOU (2-1)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/2/28/Houston_Rockets.svg",
      opponentColors: ["#CE1141","#000000"]
    },
    gameLog: [
      { date: "Feb 13", opp: "OKC", status: "W, 116-101", fanPts: "35.70", min: "37", pts: "21", reb: "6", ast: "5", st: "0", blk: "0", to: "0" },
      { date: "Feb 12", opp: "MIL", status: "L, 101-103", fanPts: "28.60", min: "39", pts: "10", reb: "8", ast: "2", st: "0", blk: "3", to: "3" },
      { date: "Feb 10", opp: "@CLE", status: "L, 107-128", fanPts: "26.10", min: "32", pts: "10", reb: "3", ast: "1", st: "4", blk: "0", to: "1" },
      { date: "Feb 8", opp: "POR", status: "W, 114-98", fanPts: "50.00", min: "37", pts: "30", reb: "10", ast: "4", st: "1", blk: "0", to: "1" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "48% center",
    imageZoom: 1,  
  },
  {
    position: "SG, SF, PF",
    name: "Amen Thompson",
    allowedPositions: ["SG", "G", "SF", "PF", "F", "Util-1", "Util-2"],
    teamColors: ["#000000", "#CE1141"],
    portrait: "amen.jpg",
    statsImage: "https://static01.nyt.com/athletic/uploads/wp/2025/01/28062605/amen-1-scaled.jpeg",
    jersey: "1",
    team: "Houston Rockets",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/2/28/Houston_Rockets.svg",
    stats: {
      rank: 39,
      gp: 52,
      pts: 13.7,
      reb: 8.1,
      ast: 3.4,
      st: 1.4,
      blk: 1.3,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Minnesota Timberwolves",
      teamRecord: "HOU vs MIN (1-2)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Minnesota_Timberwolves_logo.svg/800px-Minnesota_Timberwolves_logo.svg.png",
      opponentColors: ["#9ea2a2", "#0C2340"]
    },
    gameLog: [
      { date: "Feb 13", opp: "GSW", status: "L, 98-105", fanPts: "23.30", min: "30", pts: "4", reb: "9", ast: "5", st: "0", blk: "2", to: "5" },
      { date: "Feb 12", opp: "PHX", status: "W, 119-111", fanPts: "55.50", min: "41", pts: "18", reb: "10", ast: "11", st: "2", blk: "2", to: "3" },
      { date: "Feb 9", opp: "TOR", status: "W, 94-87", fanPts: "35.50", min: "41", pts: "8", reb: "10", ast: "5", st: "3", blk: "1", to: "4" },
      { date: "Feb 8", opp: "@DAL", status: "L, 105-116", fanPts: "40.90", min: "37", pts: "20", reb: "7", ast: "5", st: "0", blk: "3", to: "4" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "62% center",
    imageZoom: 1,  
  },
  {
    position: "C",
    name: "Domantas Sabonis",
    allowedPositions: ["C-1", "C-2", "Util-1", "Util-2"],
    teamColors: ["#5a2d81", "#63727A"],
    portrait: "sabonis.jpg",
    statsImage: "https://hips.hearstapps.com/hmg-prod/images/domantas-sabonis-of-the-sacramento-kings-reacts-during-news-photo-1731951537.jpg",
    jersey: "11",
    team: "Sacramento Kings",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/SacramentoKings.svg/1200px-SacramentoKings.svg.png",
    stats: {
      rank: 5,
      gp: 52,
      pts: 20.4,
      reb: 14.6,
      ast: 6.2,
      st: 0.6,
      blk: 0.4,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Golden State Warriors",
      teamRecord: "SAC vs GSW (2-0)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Golden_State_Warriors_logo.svg/1200px-Golden_State_Warriors_logo.svg.png",
      opponentColors: ["#1D428A", "#ffc72c"]
    },
    gameLog: [
      { date: "Feb 13", opp: "@NOP", status: "L, 133-140", fanPts: "58.10", min: "43", pts: "22", reb: "28", ast: "5", st: "0", blk: "0", to: "5" },
      { date: "Feb 12", opp: "@NOP", status: "W, 119-111", fanPts: "46.50", min: "33", pts: "16", reb: "15", ast: "5", st: "2", blk: "0", to: "1" },
      { date: "Feb 9", opp: "@DAL", status: "W, 129-128", fanPts: "43.00", min: "42", pts: "16", reb: "15", ast: "8", st: "0", blk: "0", to: "3" },
      { date: "Feb 8", opp: "NOP", status: "W, 123-118", fanPts: "47.20", min: "34", pts: "27", reb: "16", ast: "2", st: "0", blk: "0", to: "2" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "55% center",
    imageZoom: 1,  
  },
  {
    position: "PF",
    name: "Kyle Kuzma",
    allowedPositions: ["PF", "Util-1", "Util-2"],
    teamColors: ["#00471B", "#EEE1C6"],
    portrait: "kuzma.jpg",
    statsImage: "https://images2.minutemediacdn.com/image/upload/c_crop,w_2392,h_1345,x_0,y_0/c_fill,w_1200,ar_4:3,f_auto,q_auto,g_auto/images/voltaxMediaLibrary/mmsport/bucks_zone/01jm0aptgz6ncqahfmq9.jpg",
    jersey: "18",
    team: "Milwaukee Bucks",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Milwaukee_Bucks_logo.svg/1200px-Milwaukee_Bucks_logo.svg.png",
    stats: {
      rank: 161,
      gp: 37,
      pts: 15.2,
      reb: 6.1,
      ast: 2.4,
      st: 0.6,
      blk: 0.2,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Washington Wizards",
      teamRecord: "MIL vs WAS (2-0)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/02/Washington_Wizards_logo.svg/1200px-Washington_Wizards_logo.svg.png",
      opponentColors: ["#002B5C", "#e31837"]
    },
    gameLog: [
      { date: "Feb 20", opp: "LAC", status: "W, 116-110", fanPts: "18.90", min: "37", pts: "13", reb: "7", ast: "1", st: "0", blk: "0", to: "4" },
      { date: "Feb 12", opp: "@MIN", status: "W, 103-101", fanPts: "39.60", min: "39", pts: "19", reb: "13", ast: "4", st: "1", blk: "0", to: "4" },
      { date: "Feb 10", opp: "GSW", status: "L, 111-125", fanPts: "26.20", min: "34", pts: "21", reb: "6", ast: "0", st: "0", blk: "0", to: "2" },
      { date: "Feb 9", opp: "PHI", status: "W, 135-127", fanPts: "33.10", min: "36", pts: "13", reb: "8", ast: "5", st: "1", blk: "1", to: "3" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "25% center",
    imageZoom: 1,  
  },
  {
    position: "SG, SF",
    name: "Anthony Edwards",
    allowedPositions: ["SG", "G", "SF", "F", "Util-1", "Util-2"],
    teamColors: ["#9ea2a2", "#0C2340"],
    portrait: "antman.jpg",
    statsImage: "https://i.redd.it/gi024fcbdo181.jpg",
    jersey: "5",
    team: "Minnesota Timberwolves",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Minnesota_Timberwolves_logo.svg/800px-Minnesota_Timberwolves_logo.svg.png",
    stats: {
      rank: 10,
      gp: 54,
      pts: 27.5,
      reb: 5.8,
      ast: 4.5,
      st: 1.2,
      blk: 0.6,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Houston Rockets",
      teamRecord: "MIN vs @HOU (2-1)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/2/28/Houston_Rockets.svg",
      opponentColors: ["#CE1141","#000000"]
    },
    gameLog: [
      { date: "Feb 13", opp: "OKC", status: "W, 116-101", fanPts: "48.90", min: "36", pts: "23", reb: "7", ast: "7", st: "3", blk: "0", to: "2" },
      { date: "Feb 12", opp: "MIL", status: "L, 101-103", fanPts: "46.40", min: "37", pts: "28", reb: "7", ast: "4", st: "2", blk: "0", to: "2" },
      { date: "Feb 10", opp: "@CLE", status: "L, 107-128", fanPts: "48.70", min: "36", pts: "44", reb: "6", ast: "1", st: "1", blk: "0", to: "7" },
      { date: "Feb 8", opp: "POR", status: "W, 114-98", fanPts: "0.00", min: "0", pts: "0", reb: "0", ast: "0", st: "0", blk: "0", to: "0" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "55% center",
    imageZoom: 1,  
  },
  {
    position: "PG, SG, SF",
    name: "Josh Giddey",
    allowedPositions: ["PG", "SG", "SF", "G", "F", "Util-1", "Util-2"],
    teamColors: ["#CE1141", "#000000"],
    portrait: "giddler.jpg",
    statsImage: "https://content.api.news/v3/images/bin/54c0ac82279fb03ab539126558797982",
    jersey: "3",
    team: "Chicago Bulls",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Chicago_Bulls_logo.svg/1200px-Chicago_Bulls_logo.svg.png",
    stats: {
      rank: 46,
      gp: 52,
      pts: 12.4,
      reb: 7.3,
      ast: 6.3,
      st: 1.1,
      blk: 0.6,
    },
    upcomingGame: {
      gameDate: "February 22, 2025",
      opponent: "Phoenix Suns",
      teamRecord: "CHI vs PHX (0-2)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/dc/Phoenix_Suns_logo.svg/1200px-Phoenix_Suns_logo.svg.png",
      opponentColors: ["#1d1160", "#e56020"]
    },
    gameLog: [
      { date: "Feb 13", opp: "@NOP", status: "L, 133-140", fanPts: "58.10", min: "43", pts: "22", reb: "28", ast: "5", st: "0", blk: "0", to: "5" },
      { date: "Feb 12", opp: "@NOP", status: "W, 119-111", fanPts: "46.50", min: "33", pts: "16", reb: "15", ast: "5", st: "2", blk: "0", to: "1" },
      { date: "Feb 9", opp: "@DAL", status: "W, 129-128", fanPts: "43.00", min: "42", pts: "16", reb: "15", ast: "8", st: "0", blk: "0", to: "3" },
      { date: "Feb 8", opp: "NOP", status: "W, 123-118", fanPts: "47.20", min: "34", pts: "27", reb: "16", ast: "2", st: "0", blk: "0", to: "2" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "45% center",
    imageZoom: 1,  
  },
  {
    position: "C",
    name: "Alperen Sengun",
    allowedPositions: ["C-1", "C-2", "Util-1", "Util-2"],
    teamColors: ["#000000", "#CE1141"],
    portrait: "sengun.jpg",
    statsImage: "https://dknetwork.draftkings.com/wp-content/uploads/USATSI_25289028-1-2.jpg",
    jersey: "28",
    team: "Houston Rockets",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/2/28/Houston_Rockets.svg",
    stats: {
      rank: 15,
      gp: 52,
      pts: 18.8,
      reb: 10.5,
      ast: 4.9,
      st: 1.2,
      blk: 0.8,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Minnesota Timberwolves",
      teamRecord: "HOU vs MIN (1-2)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Minnesota_Timberwolves_logo.svg/800px-Minnesota_Timberwolves_logo.svg.png",
      opponentColors: ["#9ea2a2", "#0C2340"]
    },
    gameLog: [
      { date: "Feb 13", opp: "GSW", status: "L, 98-105", fanPts: "31.60", min: "27", pts: "10", reb: "13", ast: "4", st: "1", blk: "0", to: "3" },
      { date: "Feb 12", opp: "PHX", status: "W, 119-111", fanPts: "47.10", min: "38", pts: "17", reb: "13", ast: "5", st: "2", blk: "1", to: "2" },
      { date: "Feb 9", opp: "TOR", status: "W, 94-87", fanPts: "2.60", min: "3", pts: "0", reb: "3", ast: "0", st: "0", blk: "0", to: "1" },
      { date: "Feb 8", opp: "@DAL", status: "L, 105-116", fanPts: "45.10", min: "38", pts: "30", reb: "8", ast: "3", st: "0", blk: "1", to: "2" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "45% center",
    imageZoom: 1,  
  },
  {
    position: "SG, SF",
    name: "Paul George",
    allowedPositions: ["SG", "SF", "G", "F", "Util-1", "Util-2"],
    teamColors: ["#006bb6", "#ed174c"],
    portrait: "pandemicp.jpg",
    statsImage: "https://cdn.vox-cdn.com/thumbor/PFc2xumZV0XzWawLIk000vq0m3Y=/1400x1050/filters:format(jpeg)/cdn.vox-cdn.com/uploads/chorus_asset/file/25806479/usa_today_25062058.jpg",
    jersey: "8",
    team: "Philadelphia 76ers",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0e/Philadelphia_76ers_logo.svg/1200px-Philadelphia_76ers_logo.svg.png",
    stats: {
      rank: 113,
      gp: 36,
      pts: 16.2,
      reb: 5.2,
      ast: 4.4,
      st: 1.8,
      blk: 0.4,
    },
    upcomingGame: {
      gameDate: "February 2, 2025",
      opponent: "Brooklyn Nets",
      teamRecord: "PHI vs BKN (2-1)",
      opponentLogo: "https://content.sportslogos.net/logos/6/3786/full/brooklyn_nets_logo_primary_2025_sportslogosnet-1501.png",
      opponentColors: ["#FFFFFF", "#000000"]
    },
    gameLog: [
      { date: "Feb 13", opp: "@NOP", status: "L, 133-140", fanPts: "58.10", min: "43", pts: "22", reb: "28", ast: "5", st: "0", blk: "0", to: "5" },
      { date: "Feb 12", opp: "@NOP", status: "W, 119-111", fanPts: "46.50", min: "33", pts: "16", reb: "15", ast: "5", st: "2", blk: "0", to: "1" },
      { date: "Feb 9", opp: "@DAL", status: "W, 129-128", fanPts: "43.00", min: "42", pts: "16", reb: "15", ast: "8", st: "0", blk: "0", to: "3" },
      { date: "Feb 8", opp: "NOP", status: "W, 123-118", fanPts: "47.20", min: "34", pts: "27", reb: "16", ast: "2", st: "0", blk: "0", to: "2" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "48% center",
    imageZoom: 1,  
  },
  {
    position: "PF, C",
    name: "Karl-Anthony Towns",
    allowedPositions: ["PF", "F", "C-1", "C-2", "Util-1", "Util-2"],
    teamColors: ["#006BB6", "#F58426"],
    portrait: "kat.jpg",
    statsImage: "https://www.amny.com/wp-content/uploads/2025/01/2024-12-29T011048Z_979094010_MT1USATODAY25075697_RTRMADP_3_NBA-NEW-YORK-KNICKS-AT-WASHINGTON-WIZARDS.jpg",
    jersey: "32",
    team: "New York Knicks",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/25/New_York_Knicks_logo.svg/800px-New_York_Knicks_logo.svg.png",
    stats: {
      rank: 6,
      gp: 50,
      pts: 24.9,
      reb: 13.5,
      ast: 3.3,
      st: 1.0,
      blk: 0.8,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Cleveland Cavaliers",
      teamRecord: "SAC vs GSW (0-1)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Cleveland_Cavaliers_logo.svg/1200px-Cleveland_Cavaliers_logo.svg.png",
      opponentColors: ["#860038", "#041E42"]
    },
    gameLog: [
      { date: "Feb 20", opp: "CHI", status: "W, 113-111", fanPts: "59.60", min: "43", pts: "32", reb: "18", ast: "2", st: "2", blk: "0", to: "3" },
      { date: "Feb 12", opp: "ATL", status: "W, 149-148", fanPts: "59.50", min: "47", pts: "44", reb: "10", ast: "3", st: "2", blk: "0", to: "7" },
      { date: "Feb 11", opp: "@IND", status: "W, 128-115", fanPts: "68.90", min: "38", pts: "40", reb: "12", ast: "5", st: "3", blk: "0", to: "2" },
      { date: "Feb 8", opp: "BOS", status: "L, 104-131", fanPts: "25.30", min: "28", pts: "9", reb: "9", ast: "1", st: "1", blk: "1", to: "2" },
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "52% center",
    imageZoom: 1,  
  },
  {
    position: "IL",
    name: "Jonathan Kuminga",
    allowedPositions: ["IL-1", "IL-2", "IL-3"],
    teamColors: ["#1D428A", "#ffc72c"],
    portrait: "kumbucket.jpg",
    statsImage: "https://preview.redd.it/kuminga-poster-v0-19pg8sqa3hea1.jpg?width=640&crop=smart&auto=webp&s=61a2667c94e8152031ead1fa33076c83cb0b5fbe",
    jersey: "00",
    team: "Golden State Warriors",
    teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Golden_State_Warriors_logo.svg/1200px-Golden_State_Warriors_logo.svg.png",
    stats: {
      rank: 183,
      gp: 32,
      pts: 16.8,
      reb: 5.0,
      ast: 2.2,
      st: 0.9,
      blk: 0.6,
    },
    upcomingGame: {
      gameDate: "February 21, 2025",
      opponent: "Sacramento Kings",
      teamRecord: "GSW vs SAC (0-2)",
      opponentLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/SacramentoKings.svg/1200px-SacramentoKings.svg.png",
      opponentColors: ["#5a2d81", "#63727A"]
    },
    gameLog: [
      { date: "Feb 13", opp: "@HOU", status: "W, 105-98", fanPts: "0", min: "0", pts: "0", reb: "0", ast: "0", st: "0", blk: "0", to: "0" },
      { date: "Feb 12", opp: "@DAL", status: "L, 107-111", fanPts: "0", min: "0", pts: "0", reb: "0", ast: "0", st: "0", blk: "0", to: "0"},
      { date: "Feb 9", opp: "@MIL", status: "W, 125-111", fanPts: "0", min: "0", pts: "0", reb: "0", ast: "0", st: "0", blk: "0", to: "0"},
      { date: "Feb 8", opp: "@CHI", status: "	W, 132-111", fanPts: "0", min: "0", pts: "0", reb: "0", ast: "0", st: "0", blk: "0", to: "0"},
    ],
    advancedStats: {
      per: 28.4,
      usageRate: "31.2%",
      trueShooting: "63.5%",
      winShares: 9.4,
      boxPlusMinus: "+7.1",
      vorp: 5.6,
    },
    objectPosition: "55% center",
    imageZoom: 1,  
  },
];

const initialTeamSlots = [
  { id: 1,  label: "PG",     player: null },
  { id: 2,  label: "SG",     player: null },
  { id: 3,  label: "G",      player: null },
  { id: 4,  label: "SF",     player: null },
  { id: 5,  label: "PF",     player: null },
  { id: 6,  label: "F",      player: null },
  { id: 7,  label: "C-1",    player: null },
  { id: 8,  label: "C-2",    player: null },
  { id: 9,  label: "Util-1", player: null },
  { id: 10, label: "Util-2", player: null },
  { id: 11, label: "IL-1",   player: null },
  { id: 12, label: "IL-2",   player: null },
  { id: 13, label: "IL-3",   player: null },
];

function YourRoster() {
  const [bench, setBench] = useState(initialPlayers);
  const [teamSlots, setTeamSlots] = useState(initialTeamSlots);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalPlayer, setModalPlayer] = useState(null);

  useEffect(() => {
    const fetchLiveData = async () => {
      const updatedBench = await Promise.all(
        bench.map(async (player) => {
          try {
            // Call your backend for each player's name
            const response = await fetch("http://localhost:3000/getPlayerStats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ playerName: player.name })
            });
            const data = await response.json();

            // If there's an active game, compute fantasy points in the frontend
            if (data && data.game_in_progress) {
              const points = Number(data.points) || 0;
              const assists = Number(data.assists) || 0;
              const rebounds = Number(data.rebounds) || 0;
              const steals = Number(data.steals) || 0;
              const blocks = Number(data.blocks) || 0;
              const turnovers = Number(data.turnovers) || 0;

              const fantasyPoints =
                (points * 1) +
                (assists * 1.5) +
                (rebounds * 1.2) +
                (steals * 3) +
                (blocks * 3) -
                (turnovers * 1);

              return {
                ...player,
                // Update the stats if you want them accurate
                stats: {
                  ...player.stats,
                  pts: points,
                  ast: assists,
                  reb: rebounds,
                  st: steals,
                  blk: blocks,
                  to: turnovers,
                },
                fantasyPoints
              };
            } else {
              // No active game => 0 fantasy points
              return {
                ...player,
                fantasyPoints: 0
              };
            }
          } catch (error) {
            console.error("Error fetching live stats for", player.name, error);
            // If request fails, default to 0
            return {
              ...player,
              fantasyPoints: 0
            };
          }
        })
      );
      setBench(updatedBench);
    };

    fetchLiveData();
    // Poll every 15 seconds
    const intervalId = setInterval(fetchLiveData, 15000);
    return () => clearInterval(intervalId);
  }, [bench]);

  // Select/deselect a bench player
  const handlePlayerClick = (player) => {
    if (selectedPlayer && selectedPlayer.name === player.name) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
    }
  };

  // Style highlight if this is the selected player
  const getGradientBorderStyle = (player) => {
    if (!player || !selectedPlayer || player.name !== selectedPlayer.name) {
      return {};
    }
    const [color1, color2] = player.teamColors || ["#add8e6", "#87ceeb"];
    return {
      border: "4px solid transparent",
      borderImage: `linear-gradient(45deg, ${color1}, ${color2}) 1`,
      borderImageSlice: 1,
    };
  };

  // Place a selected player into a slot or remove if clicked again
  const handleSlotClick = (slotId) => {
    const slot = teamSlots.find((s) => s.id === slotId);
    if (slot.player && selectedPlayer && slot.player.name === selectedPlayer.name) {
      // Remove from slot
      const updatedTeamSlots = teamSlots.map((s) =>
        s.id === slotId ? { ...s, player: null } : s
      );
      setTeamSlots(updatedTeamSlots);
      setBench([...bench, selectedPlayer]);
      setSelectedPlayer(null);
      return;
    }
    if (!selectedPlayer) return;
    if (!selectedPlayer.allowedPositions.includes(slot.label)) {
      alert(`${selectedPlayer.name} cannot be placed in the ${slot.label} slot.`);
      return;
    }
    let updatedBench = bench.filter((p) => p.name !== selectedPlayer.name);
    if (slot.player) {
      updatedBench.push(slot.player);
    }
    const updatedTeamSlots = teamSlots.map((s) => {
      if (s.player && s.player.name === selectedPlayer.name) {
        return { ...s, player: null };
      }
      if (s.id === slotId) {
        return { ...s, player: selectedPlayer };
      }
      return s;
    });
    setTeamSlots(updatedTeamSlots);
    setBench(updatedBench);
    setSelectedPlayer(null);
  };

  // Return player from slot to bench
  const handleReturnToBench = (slotId) => {
    const slot = teamSlots.find((s) => s.id === slotId);
    if (slot && slot.player) {
      const updatedTeamSlots = teamSlots.map((s) =>
        s.id === slotId ? { ...s, player: null } : s
      );
      setTeamSlots(updatedTeamSlots);
      setBench([...bench, slot.player]);
      if (selectedPlayer && selectedPlayer.name === slot.player.name) {
        setSelectedPlayer(null);
      }
    }
  };

  const openPlayerModal = (player) => {
    setModalPlayer(player);
  };

  return (
    <div>
      <MenuBar />
      <h1 className="YR_title">Your Roster</h1>

      {/* Court Layout */}
      <div className="YR_court-wrapper">
        <div className="YR_court-container">
          <img
            src="/BasketballCourt.png"
            alt="Basketball Court"
            className="YR_court-image"
          />
          {teamSlots.map((slot) => {
            const slotStyle = getGradientBorderStyle(slot.player);
            return (
              <motion.div
                key={slot.id}
                className={`YR_team-slot slot-${slot.label.toLowerCase()}`}
                style={slotStyle}
                onClick={() => handleSlotClick(slot.id)}
                whileHover={{ scale: 1.02 }}
              >
                <div className="YR_slot-label">{slot.label}</div>
                <div className="YR_slot-player">
                  {slot.player ? (
                    <div className="YR_slot-content">
                      <img
                        src={slot.player.portrait || "https://via.placeholder.com/150"}
                        alt={slot.player.name}
                        className="YR_court-slot-portrait"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="YR_fantasy-points">
                        <strong>Fantasy Points:</strong>{" "}
                        {slot.player.fantasyPoints !== undefined
                          ? slot.player.fantasyPoints.toFixed(2)
                          : 0}
                      </div>
                      <button
                        className="YR_return-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReturnToBench(slot.id);
                        }}
                      >
                        Return
                      </button>
                      <button
                        className="YR_info-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPlayerModal(slot.player);
                        }}
                      >
                        Info
                      </button>
                    </div>
                  ) : (
                    "Empty"
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bench Layout */}
      <div className="YR_roster-page">
        <div className="YR_roster-builder">
          <div className="YR_bench">
            <h2>Bench (14 Players)</h2>
            <Reorder.Group
              values={bench}
              onReorder={setBench}
              className="YR_bench-list"
            >
              {bench.map((player) => (
                <Reorder.Item
                  key={player.name}
                  value={player}
                  whileDrag={{ scale: 1.05 }}
                  className="YR_bench-item"
                  style={getGradientBorderStyle(player)}
                >
                  <div className="YR_player-card">
                    <img
                      src={player.portrait || "https://via.placeholder.com/150"}
                      alt={player.name}
                      className="YR_player-portrait"
                      onClick={() => handlePlayerClick(player)}
                    />
                    <div className="YR_player-card-content">
                      <div className="YR_player-name">{player.name}</div>
                      <div className="YR_player-positions">{player.position}</div>
                      <div className="YR_player-fantasy-points">
                        Fantasy Points:{" "}
                        {player.fantasyPoints !== undefined
                          ? player.fantasyPoints.toFixed(2)
                          : 0}
                      </div>
                    </div>
                    <button
                      className="YR_info-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPlayerModal(player);
                      }}
                    >
                      Info
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalPlayer && (
        <PlayerStatsModal
          player={modalPlayer}
          onClose={() => setModalPlayer(null)}
        />
      )}
    </div>
  );
}

export default YourRoster;