"""RUN THIS FILE ONLY"""

import pandas as pd
import os
import glob
import openai
from gpt_functions import GPTFunctions


class CleanGPTModels:
  def __init__(self):
    self.gpt_functions = GPTFunctions()
    openai.api_key = os.environ["OPENAI_API_KEY"]
    self.df = pd.read_csv('urlViolations.csv')

  # function adds a severity score column with specified name at given index
  def add_severity_score(self, df, column_name, insert_index):
      # create dictionary to map impact types to numerical values
      impact_values = {
        'critical': 5,
        'serious': 4,
        'moderate': 3,
        'minor': 2,
        'cosmetic': 1,
      }
      # asssign numerical values to the 'impactValue' column
      df['impactValue'] = df['impact'].map(impact_values)

      # group by 'webURL' and calculate the score by summing the 'impactValue' for each group
      score_df = df.groupby('webURL')['impactValue'].sum().reset_index()

      # merge  'score_df' dataframe back into the original df based on 'webURL'
      df = pd.merge(df, score_df.rename(columns={'impactValue': column_name}), on='webURL')
      # insert score column at specified index
      df.insert(insert_index, column_name, df.pop(column_name))
      # drop the intermediary 'impactValue' column
      df.drop(columns='impactValue', inplace=True)

      return df
  
  def calculate_severity_score(self, df, score):
    total=0
    first_rows = df.groupby('webURL').first()
    for webURL, row in first_rows.iterrows():
       total = total + row[score]

    return total

  def get_dom_by_idnum(self, idnum):
        # Create the path to the text file based on 'idnum'
        dom_file_path = os.path.join('DOM', f'{idnum}.txt')

        # Check if the file exists
        if os.path.exists(dom_file_path):
            # Read and return the content of the text file
            with open(dom_file_path, 'r') as text_file:
                return text_file.read()
        else:
            return None  # Return None if the file doesn't exist

  """Create corrected DOM column"""
  def create_corrected_dom_column(self):

    # group df by 'webURLs'
    grouped_df = self.df.groupby('webURL')

    # initialize  dictionary to store the corrected DOMs for each error row
    corrected_doms_dict = {}

    # iterate through groups with the same URL
    for weburl, group_indices in grouped_df.groups.items():
        # get the group df using group indices
        group_df = self.df.loc[group_indices]

        # initialize  dictionary to store html corrections as an error fix pair
        error_fix_dict = {}

        # generate corrections for all html errors in a group
        dom = ''
        for index, row in group_df.iterrows():
            print(row['webURL'])
            # if at first row of group, initialize dom to be original group DOM
            if dom == '':
              dom_file_path = os.path.join('DOM', f'{row["DOM"]}.txt')
              with open(dom_file_path, 'r') as text_file:
                dom = text_file.read()
            # call get_correction function and store correction in dictionary
            error = row['html']
            fix = self.gpt_functions.get_correction(index)
            error_fix_dict[error] = fix

        dom_corrected = dom
        # iterate through error_fix dictionary and replace errors with fixes
        for error, fix in error_fix_dict.items():
          # insert corrections into current fixed DOM
          dom_corrected = dom_corrected.replace(error[3:-3], fix[3:-3])  # [3:-3] removes enclosing [[ ]]


        for index, row in group_df.iterrows():
          # store all corrected DOMs in the dictionary indexed by row
          # basically every row of same URL group corresponds to the final corrected DOM created above
          corrected_doms_dict[index] = dom_corrected

    # create new column with the final corrected DOMs
    self.df['DOMCorrected'] = self.df.index.map(corrected_doms_dict)


    # save dataframe with corrections as a csv file
    self.df.to_csv('corrections.csv')

  """Run corrections through Playwright"""

  # use to remove all .json files starting with 'data'
  def remove_files_starting_with(self, pattern):
      files_to_remove = glob.glob(pattern)
      for file_path in files_to_remove:
          try:
              if os.path.isfile(file_path):  # check if it's a file
                  os.remove(file_path)
          except OSError as e:
              print(f"Error while removing file '{file_path}': {e}")

  def corrections2violations(self, url, corrected_dom):
      with open("./tests/example.spec.ts", "w") as f:
        f.write(f"""


      // @ts-check
      const {{ test, expect }} = require('@playwright/test');
      const AxeBuilder = require('@axe-core/playwright').default;
      const fileReader = require('fs');

      test('all violations', async ({{ page }}) => {{
        await page.goto("{url}");

        await page.setContent(`{corrected_dom}`)

        const accessibilityScanResults = await new AxeBuilder({{ page }}).analyze(); // 4

        const violations = accessibilityScanResults.violations

        fileReader.writeFile("num_violations.txt", String(violations.length), function(err) {{
          if (err) console.log(err);
        }})

        // read violations individually into separate .json files
        for (let i = 0; i < violations.length; i++) {{
          fileReader.writeFile("data" + i + ".json", JSON.stringify(violations[i]), function(err) {{
            if (err) console.log(err);
          }})
        }}
      }});


      """)

      os.system("CI=1 npx playwright test")

      length = 0
      #store the num_violations in a length variable
      if os.path.exists('num_violations.txt'):
        length_file = open('num_violations.txt', "r")
        length = int(length_file.readline())

      new_df = pd.DataFrame()

      #build dataset by concatenating individual rows violations
      if length > 0:
        for i in range(length):
          df_temp = pd.read_json("data" + str(i) + ".json", lines=True)
          df_temp = df_temp.reset_index(drop = True)
          new_df = pd.concat([new_df, df_temp])
        new_df.insert(0, "webURL", url)
        new_df.insert(1, "numViolations", length)

      #make a row of null values for a URL that has no violations
      else:
        df_temp = pd.DataFrame({'webURL' : [url], 'numViolations' : ['0'], 'id': ['None'], 'impact': ['None'], 'tags' : ['None'], 'description': ['None'], 'help' : ['None'], 'helpUrl' : ['None'], 'html' : ['None'], 'failureSummary' : ['None']})
        df_temp = df_temp.reset_index(drop = True)
        new_df = pd.concat([new_df, df_temp])

      #add row index
      new_df = new_df.reset_index(drop=True)

      #delete data.json's to reset for the next round
      self.remove_files_starting_with("data*")

      #remove num_violations.txt file
      if os.path.exists('num_violations.txt'):
        os.remove('num_violations.txt')

      new_df = self.add_severity_score(new_df,'finalScore', 3)
      return new_df


  # call corrections2violations on entire corrections dataset
  def call_corrections2violations(self):
    df_corrections = pd.DataFrame()
    first_rows = self.df.groupby('webURL').first()

    for webURL, row in first_rows.iterrows():
        # Print current URL for progress
        print("checking",webURL)

        # Concatenate individual rows
        df_temp = self.corrections2violations(webURL, row['DOMCorrected'])
        df_corrections = pd.concat([df_corrections, df_temp])

    df_corrections.to_csv('correctionViolations.csv')

    return df_corrections

model = CleanGPTModels()
model.df = model.add_severity_score(model.df,'initialScore', 5)

print("total # of urls: ",model.df['webURL'].unique().size)
print("total # of violations: ", len(model.df))

total_initial_severity_score = model.calculate_severity_score(model.df,'initialScore')
mean_initial_severity_score = model.calculate_severity_score(model.df,'initialScore') / model.df['webURL'].unique().size

print("total initial severity score: ", total_initial_severity_score)
print("mean initial severity score: ", mean_initial_severity_score)

model.create_corrected_dom_column()
result = model.call_corrections2violations()

print("total initial severity score: ", total_initial_severity_score)
print("mean initial severity score: ", mean_initial_severity_score)

total_final_severity_score = model.calculate_severity_score(result,'finalScore')
mean_final_severity_score = model.calculate_severity_score(result,'finalScore') / result['webURL'].unique().size

print("total final severity score: ", total_final_severity_score)
print("mean final severity score: ", mean_final_severity_score)

print("total improvement: ", ((1-(total_final_severity_score/total_initial_severity_score))*100), "%")