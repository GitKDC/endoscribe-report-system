"use client";
import React, { useEffect, useState } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from "recharts";
import { FiActivity, FiPieChart, FiBarChart2, FiCalendar, FiUsers, FiMapPin, FiHeart, FiFilter } from "react-icons/fi";
import { IoIosArrowDown } from "react-icons/io";

const THEME = {
  navy:    "#1a3a52",
  navyDark:"#0f2a3f",
  teal:    "#0d9488",
  tealLight:"#ccfbf1",
  tealBg:  "#f0fdfa",
  bg:      "#f0f4f8",
  border:  "#e2e8f0",
  text:    "#1e293b",
  muted:   "#64748b",
};

const COLORS = ["#0d9488", "#2563eb", "#ea580c", "#7c3aed", "#b45309", "#dc2626", "#059669", "#be185d", "#0284c7"];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters (mock state for UI, backend handles them mostly)
  const [filters, setFilters] = useState({ dateRange: "All Time" });

  useEffect(() => {
    if ((window as any).api) {
      (window as any).api.getAnalytics(filters)
        .then((res: any) => {
          setData(res);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, [filters]);

  if (loading) {
    return <div style={{ padding: "40px", fontFamily: "Inter", color: THEME.navy }}>Loading Analytics Engine...</div>;
  }

  const cardStyle = {
    background: "#fff",
    border: `1px solid ${THEME.border}`,
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
  };

  const titleStyle = {
    margin: "0 0 20px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: THEME.navy,
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };

  return (
    <div style={{ padding: "32px 40px", background: THEME.bg, minHeight: "100%", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: THEME.navyDark }}>
            Clinical Analytics Dashboard
          </h1>
          <p style={{ margin: "6px 0 0", color: THEME.muted, fontSize: "14.5px" }}>
            Real-time disease intelligence and distribution extracted from endoscopy reports.
          </p>
        </div>
        
        {/* Filter Mockup */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <select style={{ padding: "8px 16px", paddingRight: "32px", borderRadius: "8px", border: `1px solid ${THEME.border}`, background: "#fff", fontSize: "14px", fontWeight: 600, appearance: "none", cursor: "pointer" }}>
              <option>All Time</option>
              <option>This Month</option>
              <option>Last 6 Months</option>
            </select>
            <div style={{ position: "absolute", right: "10px", pointerEvents: "none", display: "flex", color: THEME.muted }}>
              <IoIosArrowDown size={14} />
            </div>
          </div>
          <button style={{ padding: "8px 16px", borderRadius: "8px", background: THEME.navy, color: "#fff", border: "none", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            <FiFilter /> Filter
          </button>
        </div>
      </div>

      {/* Basic Metrics Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "24px" }}>
        {[
          { label: "Total Reports Generated", val: data.totalReports, icon: <FiActivity /> },
          { label: "Total Patients Treated", val: data.totalPatients, icon: <FiUsers /> },
          { label: "Reports This Month", val: data.monthReports, icon: <FiCalendar /> },
          { label: "Diseases Detected", val: data.diseaseDistribution?.length || 0, icon: <FiPieChart /> },
        ].map((m, i) => (
          <div key={i} style={{ ...cardStyle, padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: THEME.tealLight, color: THEME.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              {m.icon}
            </div>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: THEME.navyDark }}>{m.val}</div>
              <div style={{ fontSize: "12.5px", color: THEME.muted, fontWeight: "600" }}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Charts: Disease Frequency & Percentage */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* Disease Frequency */}
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiBarChart2 /> Overall Disease Frequency</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={data.diseaseDistribution?.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: THEME.muted}} />
                <YAxis tick={{fontSize: 12, fill: THEME.muted}} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="value" fill={THEME.teal} radius={[4, 4, 0, 0]} name="Cases" barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disease Percentage Pie */}
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiPieChart /> Disease Distribution %</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.diseaseDistribution?.slice(0, 5)} // top 5 for neatness
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.diseaseDistribution?.slice(0, 5).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any, name: any, props: any) => [`${value} cases (${props.payload.percentage}%)`, name]}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Top Row: Trend & Procedures (OLD RESTORED) */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiActivity /> 30-Day Report Trend</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <LineChart data={data.reportsByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: THEME.muted}} tickFormatter={(t) => t.slice(5)} />
                <YAxis allowDecimals={false} tick={{fontSize: 12, fill: THEME.muted}} />
                <RechartsTooltip contentStyle={{borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"}} />
                <Line type="monotone" dataKey="count" stroke={THEME.teal} strokeWidth={3} dot={{r: 4, fill: THEME.teal}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={titleStyle}><FiPieChart /> Procedure Breakdown</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.reportsByType} innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                  {data.reportsByType.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: "13px"}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Row: Day of Week & Diagnoses (OLD DASHBOARD RESTORED) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiCalendar /> Reports by Day of Week</h2>
          <div style={{ height: "260px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={data.reportsByDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: THEME.muted}} />
                <YAxis allowDecimals={false} tick={{fontSize: 12, fill: THEME.muted}} />
                <RechartsTooltip cursor={{fill: "#f8fafc"}} contentStyle={{borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"}} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={titleStyle}><FiBarChart2 /> Top Clinical Impressions (Historical)</h2>
          <div style={{ height: "260px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={data.topImpressions} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{fontSize: 12, fill: THEME.muted}} />
                <YAxis type="category" dataKey="name" tick={{fontSize: 12, fill: THEME.navy, fontWeight: "600"}} width={80} />
                <RechartsTooltip cursor={{fill: "#f8fafc"}} contentStyle={{borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"}} />
                <Bar dataKey="value" fill="#ea580c" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Section (OLD DASHBOARD RESTORED) */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* Age vs Conditions */}
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiHeart /> Conditions by Age Demographic (NLP)</h2>
          <p style={{ fontSize: "13px", color: THEME.muted, marginBottom: "20px" }}>
            A text-based NLP analysis extracting conditions directly from patient reports grouped by their age bracket.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {Object.keys(data.ageAnalytics).map((ageGroup) => (
              <div key={ageGroup} style={{ background: THEME.bg, padding: "16px", borderRadius: "10px", border: `1px solid ${THEME.border}` }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: THEME.navy, marginBottom: "12px", borderBottom: `1px solid ${THEME.border}`, paddingBottom: "8px" }}>
                  Age {ageGroup} <span style={{ color: THEME.muted, fontWeight: "500", fontSize: "11px", float: "right" }}>{data.ageAnalytics[ageGroup].total} patients</span>
                </div>
                {Object.keys(data.ageAnalytics[ageGroup].conditions).length === 0 ? (
                  <div style={{ fontSize: "12px", color: THEME.muted }}>No critical conditions detected.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Object.entries(data.ageAnalytics[ageGroup].conditions)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([condition, count]: any) => (
                      <div key={condition} style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                        <span style={{ color: THEME.text, fontWeight: "600" }}>{condition}</span>
                        <span style={{ color: THEME.teal, fontWeight: "700", background: THEME.tealLight, padding: "1px 6px", borderRadius: "10px" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Special Procedures & Cities */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={cardStyle}>
            <h2 style={titleStyle}><FiActivity /> Special Procedures</h2>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1, background: THEME.bg, padding: "16px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#7c3aed" }}>{data.specialProcedures.ercp}</div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: THEME.muted, marginTop: "4px" }}>ERCPs</div>
              </div>
              <div style={{ flex: 1, background: THEME.bg, padding: "16px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#b45309" }}>{data.specialProcedures.enteroscopy}</div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: THEME.muted, marginTop: "4px" }}>Enteroscopies</div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={titleStyle}><FiMapPin /> Patient Demographics (City via Referrals)</h2>
            {data.reportsByCity.length === 0 ? (
              <div style={{ fontSize: "13px", color: THEME.muted }}>No city data found from referral doctors.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.reportsByCity.slice(0, 5).map((city: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: THEME.text }}>{city.name}</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: THEME.navy }}>{city.value} referrals</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Demographics Row: Age & Gender */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* Gender Breakdown */}
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiUsers /> Disease by Gender</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={data.diseaseByGender?.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="MaleCount" name="Male" stackId="a" fill={THEME.navy} barSize={30} />
                <Bar dataKey="FemaleCount" name="Female" stackId="a" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Group Breakdown */}
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiHeart /> Disease by Age Group</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={data.diseaseByAge?.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="19-30" stackId="a" fill={COLORS[1]} />
                <Bar dataKey="31-45" stackId="a" fill={COLORS[2]} />
                <Bar dataKey="46-60" stackId="a" fill={COLORS[3]} />
                <Bar dataKey="61-75" stackId="a" fill={COLORS[4]} />
                <Bar dataKey="75+" stackId="a" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Organ & City Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* Organ Distribution */}
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiActivity /> Affected Organs</h2>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${THEME.border}`, color: THEME.muted }}>
                  <th style={{ textAlign: "left", padding: "12px 8px" }}>Organ</th>
                  <th style={{ textAlign: "right", padding: "12px 8px" }}>Total Cases</th>
                </tr>
              </thead>
              <tbody>
                {data.diseaseByOrgan?.map((o: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: "12px 8px", fontWeight: 600, color: THEME.navyDark }}>{o.name}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: THEME.teal }}>{o.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* City Distribution */}
        <div style={cardStyle}>
          <h2 style={titleStyle}><FiMapPin /> Patient Demographics (City)</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={data.diseaseByCity?.slice(0, 6)} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{fontSize: 12}} />
                <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={80} />
                <RechartsTooltip />
                <Bar dataKey="total" name="Total Patients" fill={THEME.navy} radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Monthly Trends */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <h2 style={titleStyle}><FiActivity /> Disease Monthly Trends</h2>
        <div style={{ height: "350px", width: "100%" }}>
          <ResponsiveContainer>
            <LineChart data={data.monthlyTrends} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{fontSize: 12, fill: THEME.muted}} />
              <YAxis tick={{fontSize: 12, fill: THEME.muted}} />
              <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {/* Dynamically create lines for top diseases */}
              {data.diseaseDistribution?.slice(0, 5).map((d: any, idx: number) => (
                <Line 
                  key={d.name} 
                  type="monotone" 
                  dataKey={d.name} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={3} 
                  activeDot={{ r: 6 }} 
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}