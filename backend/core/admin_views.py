from django.shortcuts import render
from django.http import HttpResponseRedirect
from django.contrib import messages
from .models import Student, ViolationReport, ETicket, TimeLog

def admin_index(request):
    """Admin dashboard - shows overview statistics"""
    student_count = Student.objects.count()
    violation_count = ViolationReport.objects.count()
    eticket_count = ETicket.objects.count()
    timelog_count = TimeLog.objects.count()

    context = {
        'student_count': student_count,
        'violation_count': violation_count,
        'eticket_count': eticket_count,
        'timelog_count': timelog_count,
    }

    return render(request, 'admin/index.html', context)

def all_students(request):
    """View all students registered in the system"""
    students = Student.objects.all()
    context = {
        'students': students,
    }
    return render(request, 'admin/students.html', context)

def student_detail(request, student_id):
    """View details of a specific student"""
    student = Student.objects.get(student_id=student_id)
    violations = ViolationReport.objects.filter(student=student)
    context = {
        'student': student,
        'violations': violations,
    }
    return render(request, 'admin/student_detail.html', context)
    