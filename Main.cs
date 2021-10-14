using System.Collections.Generic;
using Wox.Plugin;

namespace wox_teams
{
  public class Main : IPlugin
  {
    public void Init(PluginInitContext context)
    {

    }

    public List<Result> Query(Query query)
    {
      var results = new List<Result>();
      results.Add(new Result()
      {
        Title = "Yes",
        SubTitle = "My subt",
        IcoPath = "images\\teams.png",
        Action = e =>
        {
          return false;
        }
      });
      return results;
    }
  }
}
