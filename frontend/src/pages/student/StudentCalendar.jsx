import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function StudentCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/student/calendar');
        if (res.data.success) {
          setEvents(res.data.events || []);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Upcoming Deadlines & Schedule
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Chronological timeline of upcoming assignment due dates across all your enrolled subjects.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs">Loading calendar events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">No scheduled deadlines found.</div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex flex-col items-center justify-center font-bold shrink-0">
                    <span className="text-[10px] uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-base leading-none">{new Date(ev.date).getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-0.5">
                      <span className="font-bold text-xs text-slate-800">{ev.subject_code}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-[11px] text-slate-500">{ev.subject_name}</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{ev.title}</h3>
                    <div className="text-[11px] text-amber-600 mt-0.5 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Due at {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {ev.submission_id ? (
                    <Badge variant="success">Submitted</Badge>
                  ) : (
                    <Badge variant="warning">Awaiting Submission</Badge>
                  )}
                  <Link
                    to={`/student/assignments/${ev.id}`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-1"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

