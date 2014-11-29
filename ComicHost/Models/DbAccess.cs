using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;

namespace ComicHost.Models
{
    public class DbAccess
    {
        private static readonly string ConnectionStringType = ConfigurationManager.AppSettings["DbType"];

        public static DataSet GetTagIds(string[] tags)
        {
            if (tags.Length == 0)
                return null;

            var i = 0;
            var parameters = string.Join(",", tags.Select(tag => "@p" + i++));

            var connectionString = ConfigurationManager.ConnectionStrings[ConnectionStringType].ConnectionString;

            var queryString = @"select t.tagid, t.tagname from tags t
                            where t.tagname in (" + parameters + ")";

            var dataset = new DataSet();

            using (var connection = new SqlConnection(connectionString))
            {
                var command = connection.CreateCommand();
                command.CommandText = queryString;
                i = 0;

                Array.ForEach(tags, tag =>
                {
                    var param = new SqlParameter("@p" + i++, SqlDbType.VarChar) {Value = tag};
                    command.Parameters.Add(param);
                });

                try
                {
                    connection.Open();
                    var dataAdapter = new SqlDataAdapter(command);
                    dataAdapter.Fill(dataset);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
            }

            return dataset;            
        }

        public static DataSet GetTagsList(string startsWith)
        {
            var connectionString = ConfigurationManager.ConnectionStrings[ConnectionStringType].ConnectionString;
            const string queryString = @"select t.tagname from tags t where t.tagname like @p";

            var dataset = new DataSet();

            using (var connection = new SqlConnection(connectionString))
            {
                var command = connection.CreateCommand();
                command.CommandText = queryString;

                var param = new SqlParameter("@p", SqlDbType.VarChar) {Value = string.Format("{0}%", startsWith)};
                command.Parameters.Add(param);

                try
                {
                    connection.Open();
                    var dataAdapter = new SqlDataAdapter(command);
                    dataAdapter.Fill(dataset);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
            }

            return dataset;
        }

        public static DataSet GetComicsByTagList(string[] tags, int topCount)
        {
            int i = 0;
            var parameters = string.Join(",", tags.Select(tag => "@p" + i++));

            string connectionString = ConfigurationManager.ConnectionStrings[ConnectionStringType].ConnectionString;

            string queryString;

            if (tags.Length == 0)
                queryString = string.Format("select top {0} c.comicid from comics c order by c.createdate DESC;", topCount);
            else
                queryString = @"select distinct c.comicid, c.createdate from comics c
                        inner join comics_tags ct on c.comicid = ct.comicid
                        group by c.comicid, c.createdate, ct.tagid having COUNT(ct.tagid) = (
                            select count(distinct t.tagid) from tags t
                            where t.tagid=ct.tagid and t.tagname in (" + parameters + ")) order by c.createdate DESC";

            var dataset = new DataSet();

            using (var connection = new SqlConnection(connectionString))
            {
                var command = connection.CreateCommand();
                command.CommandText = queryString;
                i = 0;

                Array.ForEach(tags, tag =>
                                        {
                                            var param = new SqlParameter("@p" + i++, SqlDbType.VarChar) {Value = tag};
                                            command.Parameters.Add(param);
                                        });

                try
                {
                    connection.Open();
                    var dataAdapter = new SqlDataAdapter(command);
                    dataAdapter.Fill(dataset);
                }
                catch (Exception ex)
                {
                    throw ex;
                }
            }

            return dataset;
        }

        public static bool AddComic(Guid imageGuid, string tags)
        {
            var tagList = tags.Split(new[] {','}, StringSplitOptions.RemoveEmptyEntries);
            var tagInfo = GetTagIds(tagList);

            if (tagInfo == null)
            {
                if (AddTags(tagList) != tagList.Length)
                    return false;

                tagInfo = GetTagIds(tagList);
            }
            else if (tagInfo.Tables[0].Rows.Count < tagList.Length)
            {
                var existingTags = tagInfo.Tables[0].AsEnumerable().Select(r => r["tagname"].ToString());
                var newTags = tagList.Where(tag => !existingTags.Contains(tag));

                if (AddTags(newTags.ToArray()) != newTags.Count())
                    return false;

                tagInfo = GetTagIds(tagList);
            }

            if (tagInfo.Tables[0].Rows.Count != tagList.Length)
                return false;

            return AddComic(imageGuid, tagInfo.Tables[0].AsEnumerable().Select(r => Convert.ToInt32(r["tagid"])).ToArray());
        }

        private static bool AddComic(Guid imageGuid, int[] tagids)
        {
            var connectionString = ConfigurationManager.ConnectionStrings[ConnectionStringType].ConnectionString;

            const string cQueryString = @"INSERT INTO comics VALUES (@comicid, @createdate)";
            const string ctQueryString = @"INSERT INTO comics_tags (tagid, comicid) VALUES (@tagid, @comicid)";

            using (var connection = new SqlConnection(connectionString))
            {
                var command = connection.CreateCommand();
                command.CommandText = cQueryString;

                var comicid = new SqlParameter("@comicid", SqlDbType.UniqueIdentifier) { Value = imageGuid };
                command.Parameters.Add(comicid);
                var createdate = new SqlParameter("@createdate", SqlDbType.DateTime) { Value = DateTime.Now };
                command.Parameters.Add(createdate);

                try
                {
                    connection.Open();
                    command.ExecuteNonQuery();
                }
                catch (Exception)
                {
                    return false;
                }

                command.CommandText = ctQueryString;
                command.Parameters.Clear();
                try
                {
                    var tagid = new SqlParameter("@tagid", SqlDbType.Int);
                    command.Parameters.Add(tagid);

                    comicid = new SqlParameter("@comicid", SqlDbType.UniqueIdentifier);
                    command.Parameters.Add(comicid);

                    Array.ForEach(tagids, tag =>
                    {
                        tagid.Value = tag;
                        comicid.Value = imageGuid;
                        command.ExecuteNonQuery();
                    });
                }
                catch (Exception)
                {
                    return false;
                }
            }

            return true;
        }

        private static int AddTags(string[] tagList)
        {
            var connectionString = ConfigurationManager.ConnectionStrings[ConnectionStringType].ConnectionString;

            const string queryString = @"MERGE tags AS t USING (SELECT @p AS m) AS c
                                                    ON t.tagname = c.m
                                                    WHEN MATCHED THEN UPDATE SET tagname=@p
                                                    WHEN NOT MATCHED THEN
                                                    INSERT (tagname) VALUES (@p);";
            var result = 0;
            using (var connection = new SqlConnection(connectionString))
            {
                var command = connection.CreateCommand();
                command.CommandText = queryString;

                try
                {
                    connection.Open();

                    var param = new SqlParameter("@p", SqlDbType.VarChar);
                    command.Parameters.Add(param);

                    Array.ForEach(tagList, tag =>
                    {
                        param.Value = tag;
                        result += command.ExecuteNonQuery();
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
            }

            return result;
        }

        public static ComicModel GetComic(Guid imgGuid)
        {
            var model = new ComicModel
                            {
                                ComicPath = imgGuid.ToString()
                            };

            var connectionString = ConfigurationManager.ConnectionStrings[ConnectionStringType].ConnectionString;
            const string queryString = @"select t.tagname from tags t, comics_tags ct
                                where ct.tagid = t.tagid
                                and ct.comicid=@p";

            var dataset = new DataSet();

            using (var connection = new SqlConnection(connectionString))
            {
                var command = connection.CreateCommand();
                command.CommandText = queryString;

                var param = new SqlParameter("@p", SqlDbType.UniqueIdentifier) { Value = imgGuid };
                command.Parameters.Add(param);

                try
                {
                    connection.Open();
                    var dataAdapter = new SqlDataAdapter(command);
                    dataAdapter.Fill(dataset);
                }
                catch (Exception)
                {
                    return null;
                }
            }

            if (dataset.Tables[0].Rows.Count == 0)
                return null;

            model.ComicTags = string.Join(", ", dataset.Tables[0].AsEnumerable().Select(r => r["tagname"].ToString()));
            return model;
        }
    }
}