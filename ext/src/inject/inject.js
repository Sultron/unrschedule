
  const timezone = 'America/Los_Angeles';

  // Date object -> '19920517'
	function getDateString(date) {
		let m = date.getMonth() + 1;
		if (m < 10) m = '0' + m;
	
		let d = date.getDate();
		if (d < 10) d = '0' + d;
		
		return '' + date.getFullYear() + m + d;
	  }
	
	  // '4:30PM' -> '163000'
	  function getTimeString(time) {
		let timeString = time.substr(0, time.length - 2);
		let parts = timeString.split(':');
		if (parts[0].length != 2) {
		  parts[0] = '0' + parts[0];
		}
		timeString = parts.join('') + '00';
		if (time.match(/PM/) && parts[0] != 12) {
		  timeString = (parseInt(timeString, 10) + 120000).toString();
		}
		return timeString;
	  }
	
	  // Date object, '4:30PM' -> '19920517T163000'
	  function getDateTimeString(date, time) {
		return getDateString(date) + 'T' + getTimeString(time);
	  }
	
	  // MTWThF -> MO,TU,WE,TH,FR
	  function getDaysOfWeek(s) {
		let days = []
		if (s.match(/S[^a]/)) days.push('SU');
		if (s.match(/M/))     days.push('MO');
		if (s.match(/T[^h]/)) days.push('TU');
		if (s.match(/W/))     days.push('WE');
		if (s.match(/Th/))    days.push('TH');
		if (s.match(/F/))     days.push('FR');
		if (s.match(/S[^u]/)) days.push('SA');
	
		return days.join(',')
	  }
	
	  // VEVENT -> BEGIN:VCALENDAR...VEVENT...END:VCALENDAR
	  function wrapICalContent(iCalContent) {
		return 'BEGIN:VCALENDAR\n' +
		  'VERSION:2.0\n' +
		  'PRODID:-//Keanu Lee/Class Schedule to ICS//EN\n' +
		  iCalContent +
		  'END:VCALENDAR\n';
	  }

	

  function main() { 

	const iframe = document.querySelector('#ptifrmtgtframe').contentWindow.document.body;

	const title = iframe.querySelector('.PATRANSACTIONTITLE').textContent;

	if (title !== 'My Class Schedule') {
		return;
	}

	const iCalContentArray = [];

	let psgroupboxwbos = iframe.querySelectorAll('[id*="divDERIVED_REGFRM1_DESCR"]');
  
	Array.prototype.forEach.call(psgroupboxwbos, function(el, i) {

	  const eventTitle = el.querySelector('.PAGROUPDIVIDER').textContent.split('-');
	  const courseCode = eventTitle[0];
	  const courseName = eventTitle[1];
	  const status = el.querySelector('.PSEDITBOX_DISPONLY').textContent;
	  if (!status.includes('Enrolled')) {
		  return;
	  }

	  //const classNumber = el.querySelector('[id*=DERIVED_CLS_DTL_CLASS_NBR]').textContent;
	  //const section       = el.querySelector('a[id*="MTG_SECTION"]').textContent;
	  const classNumber = el.querySelector('span[id*="DERIVED_CLS_DTL_CLASS_NBR"]').textContent;

	  if (classNumber) {
		const daysTimes     = el.querySelector('span[id*="MTG_SCHED"]').textContent;
		const startEndTimes = daysTimes.match(/\d\d?:\d\d[AP]M/g);

		if (startEndTimes) {
		  const daysOfWeek  = getDaysOfWeek(daysTimes.match(/[A-Za-z]* /)[0]);
		  const startTime   = startEndTimes[0];
		  const endTime     = startEndTimes[1];

		  const section       = el.querySelector('a[id*="MTG_SECTION"]').textContent;
		  const component     = el.querySelector('span[id*="MTG_COMP"]').textContent;
		  const room          = el.querySelector('span[id*="MTG_LOC"]').textContent;
		  const instructor    = el.querySelector('span[id*="DERIVED_CLS_DTL_SSR_INSTR_LONG"]').textContent;
		  const startEndDate  = el.querySelector('span[id*="MTG_DATES"]').textContent;

		  //console.log(daysOfWeek, startTime, endTime, section, component, room, instructor);

		  // Start the event one day before the actual start date, then exclude it in an exception
		  // date rule. This ensures an event does not occur on startDate if startDate is not on
		  // part of daysOfWeek.
		  let startDate = new Date(startEndDate.substring(0, 10));
		  startDate.setDate(startDate.getDate() - 1);

		  // End the event one day after the actual end date. Technically, the RRULE UNTIL field
		  // should be the start time of the last occurence of an event. However, since the field
		  // does not accept a timezone (only UTC time) and Toronto is always behind UTC, we can
		  // just set the end date one day after and be guarenteed that no other occurence of
		  // this event.
		  let endDate = new Date(startEndDate.substring(13, 23));
		  endDate.setDate(endDate.getDate() + 1);

		  let iCalContent =
			'BEGIN:VEVENT\n' +
			'DTSTART;TZID=' + timezone + ':' + getDateTimeString(startDate, startTime) + '\n' +
			'DTEND;TZID=' + timezone + ':' + getDateTimeString(startDate, endTime) + '\n' +
			'LOCATION:' + room + '\n' +
			'RRULE:FREQ=WEEKLY;UNTIL=' + getDateTimeString(endDate, endTime) + 'Z;BYDAY=' + daysOfWeek + '\n' +
			'EXDATE;TZID=' + timezone + ':' + getDateTimeString(startDate, startTime) + '\n' +
			'SUMMARY:'  + courseCode + '(' + component + ')\n' +
			'DESCRIPTION:' +
			  'Course Name: '    + courseName + '\\n' +
			  'Section: '        + section + '\\n' +
			  'Instructor: '     + instructor + '\\n' +
			  'Component: '      + component + '\\n' +
			  'Class Number: '   + classNumber + '\\n' +
			  'Days/Times: '     + daysTimes + '\\n' +
			  'Start/End Date: ' + startEndDate + '\\n' +
			  'Location: '       + room + '\\n\n' +
			'END:VEVENT\n';

		  // Remove double spaces from content.
		  iCalContent = iCalContent.replace(/\s{2,}/g, ' ');

		  iCalContentArray.push(iCalContent);
		  
		  el.querySelector('span[id*="MTG_DATES"]').innerHTML += 
			'<br><a href="#" onclick="window.open(\'data:text/calendar;charset=utf8,' +
			encodeURIComponent(wrapICalContent(iCalContent)) +
			'\');">Download Class</a>'
		  ;
		  
		} // end if (startEndTimes)
	  } // end if (classNumber)






	}); // end forEach
  
	if (iCalContentArray.length > 0) {

		//let link = document.createElement('p'); 

		iframe.querySelector('#DERIVED_REGFRM1_SS_TRANSACT_TITLE').innerHTML +=  ' (<a href="#" onclick="window.open(\'data:text/calendar;charset=utf8,' +
		encodeURIComponent(wrapICalContent(iCalContentArray.join(''))) +
		'\');">Download Full Schedule</a>)';

		//iframe.appendChild(link);

	}

   }



// select the target node
const target = document.querySelector('title');

// create an observer instance
const observer = new MutationObserver(function(mutations) {
	const iframe = document.querySelector('#ptifrmtgtframe').contentWindow.document.body;
	const termSelect = iframe.querySelector('.PSLEVEL1GRIDLABEL.PSLEFTCORNER');
	
    // We need only first event and only new value of the title
    console.log(mutations[0].target.nodeValue);
	if (document.querySelector('title').textContent === 'My Class Schedule' && !termSelect) {
		main();
		observer.disconnect();
	}
});

// configuration of the observer:
const config = { subtree: true, characterData: true, childList: true };

// pass in the target node, as well as the observer options
observer.observe(target, config);

 

  
