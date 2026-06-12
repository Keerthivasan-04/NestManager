# 🏠 NestManager

A full-stack Property Management System designed for hostels, PGs, and hotels. NestManager streamlines room allocation, tenant management, bookings, payments, notifications, and analytics through a modern dashboard interface.

## 🚀 Live Demo

https://nestmanager.netlify.app

---

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control
- Protected API endpoints with Spring Security

### 🏢 Room & Bed Management
- Add, edit, and delete rooms
- Track room occupancy
- Monitor available and occupied beds
- Room status management

### 👥 Tenant Management
- Register and manage tenants
- Assign tenants to rooms
- Track tenant details and stay history

### 📅 Booking Management
- Create and manage bookings
- Check-in and check-out tracking
- Booking status monitoring

### 💳 Payment Management
- Record rent payments
- Track pending payments
- Payment history and status tracking

### 📊 Reports & Analytics
- Occupancy statistics
- Revenue analysis
- Tenant and booking insights
- Visual dashboard metrics

### 🔔 Notifications
- Payment reminders
- Booking alerts
- System notifications

---

## 🛠️ Tech Stack

### Backend
- Java 
- Spring Boot
- Spring Security
- Spring Data JPA
- Hibernate
- JWT Authentication
- Maven

### Frontend
- HTML5
- CSS3
- JavaScript 

### Database
- MySQL (Aiven Cloud)

### Deployment
- Frontend: Netlify
- Backend: Render
- Database: Aiven MySQL

---

## 📂 Project Structure

```text
NestManager
├── nestmanager_backend
│   ├── controller
│   ├── dto
│   ├── exception
│   ├── model
│   ├── repository
│   ├── scheduler
│   ├── security
│   └── service
│
├── nestmanager_frontend
│   ├── dashboard
│   ├── rooms
│   ├── tenants
│   ├── bookings
│   ├── payments
│   ├── reports
│   ├── notifications
│   └── settings
```

---

## 📸 Screenshots

### Login
![Login Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_1.png)
![Login Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_2.png)

### Dashboard
![Dashboard Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_3.png)

### Room Management
![Room Management Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_4.png)

### Tenant Management
![Tenant Management Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_5.png)

### Booking
![Booking Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_6.png)

### Payments
![Payment Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_7.png)

### Reports
![Reports Image](https://github.com/Keerthivasan-04/NestManager/blob/72bc54ecb27319887daafc96b799b507a7fa31f4/assets/Img_8.png)

---

## ⚙️ Local Setup

### Prerequisites

- Java 
- Maven
- MySQL

### Clone Repository

```bash
git clone https://github.com/Keerthivasan-04/NestManager.git
cd nestmanager
```

### Configure Database

Create a MySQL database:

```sql
CREATE DATABASE nestmanager_db;
```

Update:

```properties
application.properties
```

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/nestmanager_db
spring.datasource.username=root
spring.datasource.password=your_password
```

### Run Backend

```bash
cd nestmanager_backend
mvn spring-boot:run
```

Backend runs on:

```text
http://localhost:8080
```

### Run Frontend

Open:

```text
nestmanager_frontend/pages/login/login.html
```

using Live Server.

---


## 🎯 Key Highlights

- Full-stack enterprise-style application
- RESTful API architecture
- JWT authentication and authorization
- Deployment with Render, Netlify, and Aiven
- Responsive dashboard UI
- Production-ready project structure

---

## 📄 License

This project is developed for educational and portfolio purposes.
