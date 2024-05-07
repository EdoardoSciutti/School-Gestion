window.onload = function() {
    var tutto = document.getElementById('tutto');
    var messaggio = document.getElementById('logga');
    var esci = document.getElementById('esci');
    var accedi = document.getElementById('accedi');
    var registrati = document.getElementById('registrati');
    esci.addEventListener('click', logout);

    fetch('http://localhost:3000/api/auth/isLogged', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        } else {
            return response.json();
        }
    })
    .then(data => {
        if (data) {
            if (data.success) {
                bookingTableContainer.style.display = 'block';
                tutto.style.display = 'block';
                messaggio.style.display = 'none';
                esci.style.display = 'block';
                accedi.style.display = 'none';
                registrati.style.display = 'none';
            } else {
                bookingTableContainer.style.display = 'none';
                tutto.style.display = 'none';
                messaggio.style.display = 'block';
                esci.style.display = 'none';
                accedi.style.display = 'block';
                registrati.style.display = 'block';
            }
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function logout() {
    fetch('http://localhost:3000/api/auth/logout', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        } else {
            return response.json();
        }
    })
    .then(data => {
        if (data) {
            if (data.success) {
                window.location.href = '/';
            } else {
                console.log('Errore durante il logout');
            }
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const datePicker = document.getElementById('inputDate');
    const today = new Date();
    const formattedToday = today.toISOString().slice(0, 10);

    $(datePicker).datepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        todayHighlight: true,
    });

    $(datePicker).datepicker('setDate', today);

    document.getElementById('results').innerHTML = '';
    for (let roomId = 1; roomId <= 8; roomId++) {
        fetchBookings(roomId, formattedToday);
    }

    $(datePicker).on('changeDate', function(e) {
        const tableBody = document.getElementById('bookingTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';

        document.getElementById('results').innerHTML = '';

        for (let roomId = 1; roomId <= 8; roomId++) {
            fetchBookings(roomId, e.format('yyyy-mm-dd'));
        }
    });
});

function fetchBookings(roomId, date) {
    fetch(`http://localhost:3000/api/bookings/getBookingsOfRoom/${roomId}/${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => displayResults(data, roomId))
        .catch(error => console.error('There was a problem with your fetch operation:', error));
}

function displayResults(data, roomId) {
    const resultsDiv = document.getElementById('results');
    const tableBody = document.getElementById('bookingTable').getElementsByTagName('tbody')[0];
    console.log(data);

    let nomiStanze = ["Agorà", "Aula Magna", "Info 1", "Info 2", "Info 3", "Ele 1", "Ele 2", "Cad 1"]

    let row = document.getElementById(`room-row-${roomId}`);
    if (!row) {
        row = document.createElement('tr');
        row.id = `room-row-${roomId}`;
        let roomCell = document.createElement('td');
        roomCell.textContent = `${nomiStanze[roomId-1]}`;
        roomCell.style.textAlign = 'left';
        console.log(nomiStanze[roomId]);
        row.appendChild(roomCell);
        for (let hour = 7; hour <= 15; hour++) {
            let cell = document.createElement('td');
            cell.id = `room-${roomId}-hour-${hour}`;
            cell.textContent = hour;
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
    }

    for (let hour = 7; hour <= 15; hour++) {
        let cell = document.getElementById(`room-${roomId}-hour-${hour}`);
        cell.innerHTML = '';
        cell.removeAttribute('colspan');
        cell.style.display = '';
    }

    if (data && data.length > 0) {
        data.forEach(room => {
            room.bookings.forEach(booking => {
                const bookingColor = getRandomColor();
                const startHour = parseInt(formatTime(booking.start_time).substring(0, 2));
                const endHour = parseInt(formatTime(booking.end_time).substring(0, 2));
                const duration = endHour - startHour;

                let startCell = document.getElementById(`room-${roomId}-hour-${startHour}`);
                if (duration > 1) {
                    startCell.setAttribute('colspan', duration);
                    startCell.style.backgroundColor = bookingColor;
                    startCell.textContent = `${booking.user.name} ${booking.user.surname}`;

                    for (let hour = startHour + 1; hour < endHour; hour++) {
                        let cell = document.getElementById(`room-${roomId}-hour-${hour}`);
                        cell.style.display = 'none';
                    }
                } else {
                    startCell.style.backgroundColor = bookingColor;
                    startCell.textContent = `${booking.user.name} ${booking.user.surname}`;
                }

                let bookingDetails = document.createElement('div');
                bookingDetails.className = 'col-md-4';
                bookingDetails.innerHTML = `
                    <h4>${room.description}</h4>
                    <p><strong>Ora d'inizio:</strong> ${formatTime(booking.start_time)}<br>
                    <strong>Ora di fine:</strong> ${formatTime(booking.end_time)}<br>
                    <strong>Prenotato da:</strong> ${booking.user.name} ${booking.user.surname}<br>
                    <strong>Descrizione:</strong> ${booking.description || "Nessuna descrizione fornita"}</p>
                `;
                resultsDiv.appendChild(bookingDetails);
            });
        });
    }
}

function formatTime(timeStr) {
    return timeStr.substring(0, 5);
}

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 100%, 75%)`;
}