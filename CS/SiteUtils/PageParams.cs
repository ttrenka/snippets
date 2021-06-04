using System;
using System.Collections.Generic;
using System.Collections.Specialized;

namespace Aimedia {
	public class PageParams {
		public PageParams(){
			UserId = 0;
			ClientId = 0;
			ProgramId = 0;
			GroupId = 0;
			SelectionType = SelectionTypes.Program;
			ClientFilter = FilterTypes.Active;
			ProgramFilter = FilterTypes.Active;
			GroupFilter = FilterTypes.Active;
			DateRange = DateRangeTypes.ThisMonth;
			DateRangeType = DateRangeSelections.Range;
			SqlDateStart = "";
			SqlDateEnd = "";
		}

		public PageParams(NameValueCollection p) {
			//	Take the name/value collection and populate our properties with it
			//	Collection is either Request.QueryString or Request.Form
			ClientId = Convert.ToInt32(p["c"]);
			ProgramId = Convert.ToInt32(p["p"]);
			GroupId = Convert.ToInt32(p["g"]);
			SelectionType = p["t"];
			ClientFilter = p["cf"];
			ProgramFilter = p["pf"];
			GroupFilter = p["gf"];
			DateRange = p["dr"];
			DateRangeType = p["r"];
			SqlDateStart = p["s"];
			SqlDateEnd = p["e"];

			//	get the budget/budgets for the client/program/group
			getBudget();
		}

		//	properties
		private string programIds = "0";

		public int UserId { get; set; }
		public int ClientId { get; private set; }
		public int ProgramId { get; private set; }
		public int GroupId { get; private set; }
		public string SelectionType { get; set; }
		public string ClientFilter { get; private set; }
		public string ProgramFilter { get; private set; }
		public string GroupFilter { get; private set; }
		public string DateRange { get; private set; }
		public string DateRangeType { get; private set; }
		public string SqlDateStart { get; private set; }
		public string SqlDateEnd { get; private set; }

		//	budget information
		public bool HasBudget { get; private set; }
		public Dictionary<string, object> Budget { get; private set; }
		public Dictionary<string, Dictionary<string, object>> Budgets { get; private set; }

		//	PROGRAM ONLY
		private string programBudgetSQL = @"WITH CTE AS (SELECT id, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust,targetCPL FROM campaigns WHERE id = @id),
		CTE2 AS (
			SELECT campaignId, budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn, rn
			FROM
			(SELECT campaignid, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn,
					ROW_NUMBER() OVER (PARTITION BY campaignId order by changedOn desc) as rn
			FROM campaignHistory 
			WHERE campaignId = @id
				AND changedOn between @startDateFull and @endDateFull) AS a
			WHERE a.rn = 1
		)
		SELECT 
			COALESCE(c2.budget, c.budget) AS budget,
			COALESCE(c2.contractBudget, c.contractBudget) AS contractBudget,
			COALESCE(c2.serviceFee, c.serviceFee) AS serviceFee,
			COALESCE(c2.phoneBudget, c.phoneBudget) AS phoneBudget,
			COALESCE(c2.budgetAdjust, c.budgetAdjust) AS budgetAdjust,
			COALESCE(c2.targetCPL, c.targetCPL) AS targetCPL
		FROM CTE c 
			LEFT OUTER JOIN CTE2 c2 on c.id = c2.campaignID";

		//	CLIENTS
		private string clientBudgetSQL = @"WITH CTE AS (SELECT id, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust,targetCPL 
			FROM campaigns WHERE id in 
			(select DISTINCT c.id from campaigns c join networkCampaignReport ncr 
						on ncr.campaignID = c.id 
				where c.clientID = @id
					and NCR.reportDate BETWEEN @startDateFull AND @endDateFull 
					and ((NCR.impressions > 0) or (NCR.clicks >0) or (c.state = '1'))
			)
		),
		CTE2 AS (
		SELECT campaignId, budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn, rn
		FROM
		(SELECT campaignid, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn,
				ROW_NUMBER() OVER (PARTITION BY campaignId order by changedOn desc) as rn
		FROM campaignHistory 
		WHERE campaignId in 
				(select DISTINCT c.id from campaigns c join networkCampaignReport ncr 
								on ncr.campaignID = c.id 
						where c.clientID = @id
							and NCR.reportDate BETWEEN @startDateFull AND @endDateFull 
							and ((NCR.impressions > 0) or (NCR.clicks >0) or (c.state = '1'))
				)
			AND changedOn between @startDateFull and @endDateFull) AS a
		WHERE a.rn = 1
		)
		SELECT 
			SUM(COALESCE(c2.budget, c.budget)) AS budget,
			SUM(COALESCE(c2.contractBudget, c.contractBudget)) AS contractBudget,
			SUM(COALESCE(c2.serviceFee, c.serviceFee)) AS serviceFee,
			SUM(COALESCE(c2.phoneBudget, c.phoneBudget)) AS phoneBudget,
			SUM(COALESCE(c2.budgetAdjust, c.budgetAdjust)) AS budgetAdjust,
			AVG(COALESCE(c2.targetCPL, c.targetCPL)) AS targetCPL
		FROM CTE c 
			LEFT OUTER JOIN CTE2 c2 on c.id = c2.campaignID";

		private string clientBudgetListSQL = @"WITH CTE AS (SELECT id, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust,targetCPL FROM campaigns WHERE id in 
			(select DISTINCT c.id from campaigns c join networkCampaignReport ncr 
						on ncr.campaignID = c.id 
				where c.clientID = @id
					and NCR.reportDate BETWEEN @startDateFull AND @endDateFull 
					and ((NCR.impressions > 0) or (NCR.clicks >0) or (c.state = '1'))
			)
		),
		CTE2 AS (
		SELECT campaignId, budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn, rn
		FROM
		(SELECT campaignid, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn,
				ROW_NUMBER() OVER (PARTITION BY campaignId order by changedOn desc) as rn
		FROM campaignHistory 
		WHERE campaignId in 
				(select DISTINCT c.id from campaigns c join networkCampaignReport ncr 
								on ncr.campaignID = c.id 
						where c.clientID = @id
							and NCR.reportDate BETWEEN @startDateFull AND @endDateFull 
							and ((NCR.impressions > 0) or (NCR.clicks >0) or (c.state = '1'))
				)
			AND changedOn between @startDateFull and @endDateFull) AS a
		WHERE a.rn = 1
		)
		SELECT 
			c.id AS program,
			(COALESCE(c2.budget, c.budget)) AS budget,
			(COALESCE(c2.contractBudget, c.contractBudget)) AS contractBudget,
			(COALESCE(c2.serviceFee, c.serviceFee)) AS serviceFee,
			(COALESCE(c2.phoneBudget, c.phoneBudget)) AS phoneBudget,
			(COALESCE(c2.budgetAdjust, c.budgetAdjust)) AS budgetAdjust,
			(COALESCE(c2.targetCPL, c.targetCPL)) AS targetCPL
		FROM CTE c 
			LEFT OUTER JOIN CTE2 c2 on c.id = c2.campaignID";

		//	GROUPS
		private string groupBudgetSQL = @"WITH CTE AS (SELECT id, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust,targetCPL FROM campaigns WHERE id in (select campaign_id from campaignGroups_campaigns where group_id = @id)),
			CTE2 AS (
			SELECT campaignId, budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn, rn
			FROM
			(SELECT campaignid, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn,
					ROW_NUMBER() OVER (PARTITION BY campaignId order by changedOn desc) as rn
			FROM campaignHistory 
			WHERE campaignId in (select campaign_id from campaignGroups_campaigns where group_id = @id)
				AND changedOn between @startDateFull and @endDateFull) AS a
			WHERE a.rn = 1
			)
			SELECT 
				SUM(COALESCE(c2.budget, c.budget)) AS budget,
				SUM(COALESCE(c2.contractBudget, c.contractBudget)) AS contractBudget,
				SUM(COALESCE(c2.serviceFee, c.serviceFee)) AS serviceFee,
				SUM(COALESCE(c2.phoneBudget, c.phoneBudget)) AS phoneBudget,
				SUM(COALESCE(c2.budgetAdjust, c.budgetAdjust)) AS budgetAdjust,
				AVG(COALESCE(c2.targetCPL, c.targetCPL)) AS targetCPL
			FROM CTE c 
				LEFT OUTER JOIN CTE2 c2 on c.id = c2.campaignID";

		private string groupBudgetListSQL = @"WITH CTE AS (SELECT id, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust,targetCPL FROM campaigns WHERE id in (select campaign_id from campaignGroups_campaigns where group_id = @id)),
			CTE2 AS (
			SELECT campaignId, budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn, rn
			FROM
			(SELECT campaignid, (contractBudget + phoneBudget + budgetAdjust) AS budget, contractBudget, serviceFee, phoneBudget, budgetAdjust, targetCPL, changedOn,
					ROW_NUMBER() OVER (PARTITION BY campaignId order by changedOn desc) as rn
			FROM campaignHistory 
			WHERE campaignId in (select campaign_id from campaignGroups_campaigns where group_id = @id)
				AND changedOn between @startDateFull and @endDateFull) AS a
			WHERE a.rn = 1
			)
			SELECT 
				c.id AS program,
				(COALESCE(c2.budget, c.budget)) AS budget,
				(COALESCE(c2.contractBudget, c.contractBudget)) AS contractBudget,
				(COALESCE(c2.serviceFee, c.serviceFee)) AS serviceFee,
				(COALESCE(c2.phoneBudget, c.phoneBudget)) AS phoneBudget,
				(COALESCE(c2.budgetAdjust, c.budgetAdjust)) AS budgetAdjust,
				(COALESCE(c2.targetCPL, c.targetCPL)) AS targetCPL
			FROM CTE c 
				LEFT OUTER JOIN CTE2 c2 on c.id = c2.campaignID";

		//	methods
		public void getBudget(){
			//	get the initial budget for our main selection, and if the main selection is a client or group,
			//	get the list of programs along with their own budgets for the supplimental Budgets list.
			Dictionary<string, object> p = GetSQLParams();
			HasBudget = false;

			//	initial budget first
			string sql = "";
			if(SelectionType == "c"){
				sql = clientBudgetSQL;
				if(UserId != 0){
					sql += @" INNER JOIN viewAccess v
						ON v.canViewType = 2
						AND v.canViewID = c.id 
						AND v.userID = " + UserId;
				}
			} else if (SelectionType == "g"){
				sql = groupBudgetSQL;
				if(UserId != 0){
					sql += @" INNER JOIN viewAccess v
						ON v.canViewType = 2
						AND v.canViewID = c.id 
						AND v.userID = " + UserId;
				}			
			} else {
				sql = programBudgetSQL;
			}
			List<Dictionary<string, object>> rs = Utilities.FetchDataRaw(Utilities.ConnectionString, sql, p);
			if(rs.Count > 0){
				HasBudget = true;
				Budget = rs[0];
			}

			//	If this is a client or group, get the program budget list, and the private phrase lists.
			if(HasBudget == true && SelectionType != "p"){
				if(SelectionType == "c"){
					sql = clientBudgetListSQL;
					if(UserId != 0){
						sql += @" INNER JOIN viewAccess v
							ON v.canViewType = 2
							AND v.canViewID = c.id 
							AND v.userID = " + UserId;
					}				
				}
				if (SelectionType == "g"){
					sql = groupBudgetListSQL;
					if(UserId != 0){
						sql += @" INNER JOIN viewAccess v
							ON v.canViewType = 2
							AND v.canViewID = c.id 
							AND v.userID = " + UserId;
					}				
				}
				List<Dictionary<string, object>> lrs = Utilities.FetchDataRaw(Utilities.ConnectionString, sql, p);
				Budgets = new Dictionary<string, Dictionary<string, object>>();
				List<int> ids = new List<int>();
				for(int i = 0; i < lrs.Count; i++){
					Dictionary<String, Object> row = lrs[i];
					Budgets.Add(Convert.ToString(row["program"]), row);
					ids.Add((int)row["program"]);
				}
				//	Now that we have our ID list, add to the phrase string.
				if(lrs.Count > 0){
					programIds = String.Join(",", ids.ToArray());
				}
			}
		}

		public string CreateGet(){
			string ret = "?c=" + ClientId + "&p=" + ProgramId + "&g=" + GroupId + "&t=" + SelectionType + "&cf=" + ClientFilter
				+ "&pf=" + ProgramFilter + "&gf=" + GroupFilter + "&r=" + DateRangeType + "&s=" + SqlDateStart + "&e=" + SqlDateEnd;
			return ret;
		}
		public string CreatePost(){
			return "";	//	just a stub for now
		}

		//	For use by any server-side SQL configurations.
		public Dictionary<string, object> GetSQLParams(){
			Dictionary<string, object> p = new Dictionary<string, object>();

			//	Start with the dates.
			p.Add("startDate", SqlDateStart);
			p.Add("startDateFull", SqlDateStart + " 00:00:00.000");
			p.Add("endDate", SqlDateEnd);
			p.Add("endDateFull", SqlDateEnd + " 23:59:59.997");

			//	OK, figure out if this is a client, program or group and set the right params for it.
			p.Add("idType", SelectionType);
			if(SelectionType == "c"){
				p.Add("id", ClientId);
			} else if (SelectionType == "g"){
				p.Add("id", GroupId);
			} else {
				p.Add("id", ProgramId);
			}
			return p;
		}

		public string GetSQLPhrase(){
			string phrase = " = @id ";
			if(SelectionType != "p"){
				phrase = " IN (" + programIds + ") ";
			}
			return phrase;
		}
		public string GetSQLPhrase(string param){
			string phrase = param + " = @id ";
			if(SelectionType != "p"){
				phrase = param + " IN (" + programIds + ") ";
			}
			return phrase;
		}
	}
		//	internal structs used as code aliases
	public struct SelectionTypes {
		public static string Client = "c";
		public static string Program = "p";
		public static string Group = "g";
	}

	public struct FilterTypes {
		public static string Active = "a";
		public static string Pending = "d";
		public static string Paused = "p";
		public static string All = "l";
	}

	public struct DateRangeTypes {
		public static string CustomRange = "cr";
		public static string Yesterday = "y";			
		public static string Last7Days = "l7";
		public static string LastWeek = "lw";
		public static string ThisMonth = "tm";
		public static string LastMonth = "lm";
		public static string Last90Days = "l9";
	}

	public struct DateRangeSelections {
		public static string Dates = "d";
		public static string Range = "r";
	}
}